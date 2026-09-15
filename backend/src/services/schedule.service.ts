import type { PoolClient } from "pg";
import { getPool } from "../config/db.js";
import type { TimeInterval, TimeIntervalDB } from "../types/exception.js";
import type { ScheduleDiff, WeeklyScheduleDB, DayScheduleDB, WeeklySchedule, DaySchedule } from "../types/schedule.js";
import { redis } from "../config/redis.js";

export async function updateSchedulesForStudio(
  studioId: string,
  diff: ScheduleDiff
): Promise<WeeklySchedule[]> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // DELETE — cascades to day_schedules and time_intervals
    if (diff.toDelete.length) {
      await client.query(
        `DELETE FROM weekly_schedules
         WHERE id = ANY($1) AND studio_id = $2`,
        [diff.toDelete, studioId]
      );
    }

    // INSERT
    for (const schedule of diff.toInsert) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO weekly_schedules (studio_id, effective_from, effective_to)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [studioId, schedule.effectiveFrom ?? null, schedule.effectiveTo ?? null]
      );

      const weeklyId = rows[0]!.id;
      await insertDays(client, weeklyId, schedule.days);
    }

    // UPDATE
    for (const schedule of diff.toUpdate) {
      await client.query(
        `UPDATE weekly_schedules
         SET effective_from = $1, effective_to = $2, updated_at = now()
         WHERE id = $3 AND studio_id = $4`,
        [schedule.effectiveFrom ?? null, schedule.effectiveTo ?? null, schedule.id, studioId]
      );

      // Replace all days and their intervals
      const { rows: dayRows } = await client.query<{ id: string }>(
        `SELECT id FROM day_schedules WHERE weekly_schedule_id = $1`,
        [schedule.id]
      );

      const dayIds = dayRows.map(r => r.id);

      if (dayIds.length) {
        await client.query(
          `DELETE FROM time_intervals WHERE day_schedule_id = ANY($1)`,
          [dayIds]
        );
        await client.query(
          `DELETE FROM day_schedules WHERE weekly_schedule_id = $1`,
          [schedule.id]
        );
      }

      await insertDays(client, schedule.id, schedule.days);
    }

    await client.query('COMMIT');
    
    await redis.incr(`studio:${studioId}:availability:version`);

    // Return full updated list
    const { rows: weeklyRows } = await client.query<WeeklyScheduleDB>(
      `SELECT * FROM weekly_schedules
       WHERE studio_id = $1
       ORDER BY effective_from ASC NULLS FIRST`,
      [studioId]
    );

    const schedules = await Promise.all(
      weeklyRows.map(row => hydrateSchedule(client, row))
    );

    return schedules;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---- Helpers ----

async function insertDays(
  client: PoolClient,
  weeklyId: string,
  days: DaySchedule[]
): Promise<void> {
  for (const day of days) {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO day_schedules (weekly_schedule_id, day_of_week, is_closed)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [weeklyId, day.dayOfWeek, day.isClosed]
    );

    const dayId = rows[0]!.id;

    if (!day.isClosed && day.intervals.length) {
      await insertDayIntervals(client, dayId, day.intervals);
    }
  }
}

async function insertDayIntervals(
  client: PoolClient,
  dayScheduleId: string,
  intervals: TimeInterval[]
): Promise<void> {
  if (!intervals.length) return;

  const values = intervals
    .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
    .join(', ');

  const params = intervals.flatMap(i => [dayScheduleId, i.start, i.end]);

  await client.query(
    `INSERT INTO time_intervals (day_schedule_id, start_time, end_time)
     VALUES ${values}`,
    params
  );
}

async function hydrateSchedule(
  client: PoolClient,
  row: WeeklyScheduleDB
): Promise<WeeklySchedule> {
  const { rows: dayRows } = await client.query<DayScheduleDB>(
    `SELECT * FROM day_schedules
     WHERE weekly_schedule_id = $1
     ORDER BY day_of_week ASC`,
    [row.id]
  );

  const days = await Promise.all(
    dayRows.map(async (day): Promise<DaySchedule> => {
      const { rows: intervalRows } = await client.query<TimeIntervalDB>(
        `SELECT * FROM time_intervals WHERE day_schedule_id = $1`,
        [day.id]
      );

      return {
        id:        day.id,
        dayOfWeek: day.day_of_week,
        isClosed:  day.is_closed,
        intervals: intervalRows.map(i => ({ start: i.start_time, end: i.end_time })),
      };
    })
  );

  return {
    id:            row.id,
    effectiveFrom: row.effective_from,
    effectiveTo:   row.effective_to,
    days,
    studio:        row.studio_id,
  };
}