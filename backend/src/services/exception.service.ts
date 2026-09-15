import type { PoolClient } from "pg";
import { getPool } from "../config/db.js";
import type { ExceptionDiff, ScheduleException, ScheduleExceptionDB, TimeInterval, ExceptionDateRuleDB, TimeIntervalDB, ExceptionAppliesTo } from "../types/exception.js";
import { redis } from "../config/redis.js";

export async function updateExceptionsForStudio(
  studioId: string,
  diff: ExceptionDiff
): Promise<ScheduleException[]> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // DELETE — cascades to time_intervals and exception_date_rules
    if (diff.toDelete.length) {
      await client.query(
        `DELETE FROM schedule_exceptions
         WHERE id = ANY($1) AND studio_id = $2`,
        [diff.toDelete, studioId]
      );
    }

    // INSERT
    for (const e of diff.toInsert) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO schedule_exceptions (studio_id, label, is_closed)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [studioId, e.label || null, e.isClosed]
      );

      const exceptionId = rows[0]!.id;
      await insertDateRule(client, exceptionId, e);
      await insertIntervals(client, exceptionId, e.intervals);
    }

    // UPDATE
    for (const e of diff.toUpdate) {
      await client.query(
        `UPDATE schedule_exceptions
         SET label = $1, is_closed = $2, updated_at = now()
         WHERE id = $3 AND studio_id = $4`,
        [e.label || null, e.isClosed, e.id, studioId]
      );

      // Replace date rule and intervals for this exception
      await client.query(
        `DELETE FROM exception_date_rules WHERE exception_id = $1`,
        [e.id]
      );
      await client.query(
        `DELETE FROM time_intervals WHERE exception_id = $1`,
        [e.id]
      );

      await insertDateRule(client, e.id, e);
      await insertIntervals(client, e.id, e.intervals);
    }

    await client.query('COMMIT');

    await redis.incr(`studio:${studioId}:availability:version`);

    // Return full updated list
    const { rows: exceptionRows } = await client.query<ScheduleExceptionDB>(
      `SELECT * FROM schedule_exceptions
       WHERE studio_id = $1
       ORDER BY created_at ASC`,
      [studioId]
    );

    const exceptions = await Promise.all(
      exceptionRows.map(row => hydrateException(client, row))
    );

    return exceptions;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---- Helpers ----

async function insertDateRule(
  client: PoolClient,
  exceptionId: string,
  e: ScheduleException
): Promise<void> {
  const a = e.appliesTo;

  if (a.type === 'oneOff') {
    await client.query(
      `INSERT INTO exception_date_rules (exception_id, type, date)
       VALUES ($1, 'oneOff', $2)`,
      [exceptionId, a.date] // a.date is string ✓
    );
  } else if (a.type === 'range') {
    await client.query(
      `INSERT INTO exception_date_rules (exception_id, type, start_date, end_date)
       VALUES ($1, 'range', $2, $3)`,
      [exceptionId, a.startDate, a.endDate] // narrowed ✓
    );
  } else if (a.type === 'annual') {
    await client.query(
      `INSERT INTO exception_date_rules (exception_id, type, month, day)
       VALUES ($1, 'annual', $2, $3)`,
      [exceptionId, a.month, a.day] // narrowed ✓
    );
  }
}

async function insertIntervals(
  client: PoolClient,
  exceptionId: string,
  intervals: TimeInterval[]
): Promise<void> {
  if (!intervals.length) return;

  const values = intervals
    .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
    .join(', ');

  const params = intervals.flatMap(i => [exceptionId, i.start, i.end]);

  await client.query(
    `INSERT INTO time_intervals (exception_id, start_time, end_time)
     VALUES ${values}`,
    params
  );
}

async function hydrateException(
  client: PoolClient,
  row: ScheduleExceptionDB
): Promise<ScheduleException> {
  const { rows: ruleRows } = await client.query<ExceptionDateRuleDB>(
    `SELECT * FROM exception_date_rules WHERE exception_id = $1 LIMIT 1`,
    [row.id]
  );

  const { rows: intervalRows } = await client.query<TimeIntervalDB>(
    `SELECT * FROM time_intervals WHERE exception_id = $1`,
    [row.id]
  );

  const rule = ruleRows[0]!;

  if (!rule) {
    throw new Error(`No date rule found for exception ${row.id}`);
  }

  const appliesTo: ExceptionAppliesTo =
    rule.type === 'oneOff'  ? { type: 'oneOff',  date: rule.date! }                          :
    rule.type === 'range'   ? { type: 'range',   startDate: rule.start_date!, endDate: rule.end_date! } :
                              { type: 'annual',  month: rule.month!,  day: rule.day! };

  return {
    id:        row.id,
    label:     row.label ?? '',
    type:      rule.type,
    appliesTo,
    isClosed:  row.is_closed,
    intervals: intervalRows.map(i => ({ start: i.start_time, end: i.end_time })),
    studio:    row.studio_id,
  };
}