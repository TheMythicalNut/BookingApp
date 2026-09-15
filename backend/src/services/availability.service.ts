import { AVAILABILITY_TTL, BLOCKING_STATUSES, DEFAULT_MAX_AHEAD, DEFAULT_MIN_AHEAD } from "../config/CONST.js";
import { redis } from "../config/redis.js";
import type { ScheduleException } from "../types/exception.js";
import type { Reservation, reservation_status } from "../types/reservation.js";
import type { WeeklySchedule } from "../types/schedule.js";
import type { Available, Studio } from "../types/studio.js";
import { DateTime } from "luxon";
import { getReservationsByOptions } from "./reservations.service.js";


export async function getStudioAvailDefaultOptions(
  studio: Studio
): Promise<Available[]> {
  
      const now = DateTime.now();
      const options = { 
          studio: studio.id,
          timeslot: {
              startDate: now.plus({ minutes: studio.minScheduleAhead ?? DEFAULT_MIN_AHEAD}).toJSDate(),
              endDate: now.plus({ minutes: studio.maxScheduleAhead  ?? DEFAULT_MAX_AHEAD}).toJSDate(),
              start: '00:00',
              end: '00:00',
          },
          status: ['CONFIRMED', 'PENDING_CONFIRMATION'] as reservation_status[],
      }
      const studioReservations: Reservation[] = await getReservationsByOptions(options);

      const avail = await getStudioAvailabilityCached(studio, studioReservations);
          
      return avail;
}

export async function getStudioAvailabilityCached(
  studio: Studio,
  reservations: Reservation[]
) : Promise<Available[]> {
  const zone = studio.timeZone;

  const bucketNow = getTimeBucket(DateTime.now().setZone(zone), 5);
  const versionKey = `studio:${studio.id}:availability:version`;
  const version = (await redis.get(versionKey)) ?? "0";
  const cacheKey =`studio:${studio.id}:availability:${version}:${bucketNow.toISO()}`;

  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const result = computeStudioAvailability(studio, reservations);

  await redis.set(cacheKey, JSON.stringify(result), "EX", AVAILABILITY_TTL);

  return result;
}

function getTimeBucket(dt: DateTime, minutes: number) {
  const bucket = Math.floor(dt.minute / minutes) * minutes;
  return dt.set({ minute: bucket, second: 0, millisecond: 0 });
}


export function computeStudioAvailability(
  studio: Studio,
  reservations: Reservation[]
): Available[] {

  const zone = studio.timeZone;

  const now = DateTime.now().setZone(zone).startOf("minute");

  const minAhead = studio.minScheduleAhead ?? DEFAULT_MIN_AHEAD;
  const maxAhead = studio.maxScheduleAhead ?? DEFAULT_MAX_AHEAD;

  const windowStart = now.plus({ minutes: minAhead }).startOf("minute");
  const windowEnd   = now.plus({ minutes: maxAhead }).startOf("minute");

  const blockingReservations = reservations.filter((r) =>
    BLOCKING_STATUSES.has(r.status.status)
  );

  const reservationsByDate = new Map<string, Reservation[]>();

  for (const r of blockingReservations) {
    if (!reservationsByDate.has(r.timeslot.date)) {
      reservationsByDate.set(r.timeslot.date, []);
    }
    reservationsByDate.get(r.timeslot.date)!.push(r);
  }

  const result: Available[] = [];

  let cursor = windowStart;

  while (cursor <= windowEnd) {
    const date = cursor.toISODate()!;
    const dayOfWeek = cursor.weekday % 7;

    const schedule = getActiveWeeklySchedule(studio.weeklySchedules, date);

    if (!schedule) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    const daySchedule = schedule.days.find((d) => d.dayOfWeek === dayOfWeek);

    if (!daySchedule || daySchedule.isClosed) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    let baseIntervals = daySchedule.intervals.map((i) => ({
      start: parseTime(date, i.start, zone),
      end: parseTime(date, i.end, zone)
    }));

    const exception = studio.exceptions.find((e) =>
      doesExceptionApply(e, cursor)
    );

    if (exception) {
      if (exception.isClosed) {
        cursor = cursor.plus({ days: 1 });
        continue;
      }

      baseIntervals = exception.intervals.map((i) => ({
        start: parseTime(date, i.start, zone),
        end: parseTime(date, i.end, zone)
      }));
    }

    // Clip first day
    if (cursor.hasSame(windowStart, "day")) {
      baseIntervals = baseIntervals
          .map(i => ({
          start: i.start < windowStart ? windowStart : i.start,
          end: i.end
          }))
          .filter(i => i.start < i.end);
    }

    // Clip last day
    if (cursor.hasSame(windowEnd, "day")) {
      baseIntervals = baseIntervals
          .map(i => ({
          start: i.start,
          end: i.end > windowEnd ? windowEnd : i.end
          }))
          .filter(i => i.start < i.end);
    }


    const dayReservations = reservationsByDate.get(date) ?? [];

    const reservationIntervals = dayReservations.map((r) => {
      const start = parseTime(date, r.timeslot.start, zone);

      const end = r.timeslot.end
        ? parseTime(date, r.timeslot.end, zone)
        : start.plus({ minutes: r.duration });

      return { start, end };
    });

    const mergedReservations = mergeIntervals(reservationIntervals);

    const free = subtractIntervals(baseIntervals, mergedReservations);

    const normalized = mergeIntervals(free).filter(
      (i) => i.start < i.end
    );

    if (normalized.length > 0) {
      result.push({
        date,
        intervals: normalized.map((i) => ({
          start: formatTime(i.start),
          end: formatTime(i.end)
        }))
      });
    }

    cursor = cursor.plus({ days: 1 });
  }

  return result;
}


/* ============================= HELPERS ============================= */

function parseTime(date: string, time: string, zone: string): DateTime {
  const [h, m] = time.split(":").map(Number);
  return DateTime.fromISO(date, { zone }).set({ hour: h, minute: m, second: 0, millisecond: 0 });
}

function formatTime(dt: DateTime): string {
  return dt.toFormat("HH:mm");
}

function mergeIntervals(intervals: { start: DateTime; end: DateTime }[]) {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort(
    (a, b) => a.start.toMillis() - b.start.toMillis()
  );

  const result: { start: DateTime; end: DateTime }[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const prev = result[result.length - 1]!;

    if (cur.start <= prev.end) {
      prev.end = prev.end > cur.end ? prev.end : cur.end;
    } else {
      result.push({ ...cur });
    }
  }

  return result;
}

function subtractIntervals(
  base: { start: DateTime; end: DateTime }[],
  blocks: { start: DateTime; end: DateTime }[]
) {
  let result = [...base];

  for (const block of blocks) {
    const next: typeof result = [];

    for (const interval of result) {
      if (block.end <= interval.start || block.start >= interval.end) {
        next.push(interval);
        continue;
      }

      if (block.start > interval.start) {
        next.push({
          start: interval.start,
          end: block.start
        });
      }

      if (block.end < interval.end) {
        next.push({
          start: block.end,
          end: interval.end
        });
      }
    }

    result = next;
  }

  return result;
}

function getActiveWeeklySchedule(
  schedules: WeeklySchedule[],
  date: string
): WeeklySchedule | null {
  const dt = DateTime.fromISO(date);

  const candidates = schedules.filter((s) => {
    const fromOk =
      !s.effectiveFrom || DateTime.fromISO(s.effectiveFrom) <= dt;
    const toOk =
      !s.effectiveTo || DateTime.fromISO(s.effectiveTo) >= dt;
    return fromOk && toOk;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aFrom = a.effectiveFrom ? DateTime.fromISO(a.effectiveFrom).toMillis() : -Infinity;
    const bFrom = b.effectiveFrom ? DateTime.fromISO(b.effectiveFrom).toMillis() : -Infinity;
    return bFrom - aFrom;
  });

  return candidates[0] ?? null;
}

function doesExceptionApply(
  exception: ScheduleException,
  date: DateTime
) {

    switch(exception.appliesTo.type){
        case "oneOff":
        if (exception.appliesTo.date === date.toISODate()) return true;
        break;
        case "range":
        const start = DateTime.fromISO(exception.appliesTo.startDate);
        const end = DateTime.fromISO(exception.appliesTo.endDate);
        if (date >= start && date <= end) return true;
        break;
        case "annual":
        if (exception.appliesTo.month === date.month && exception.appliesTo.day === date.day) return true;
        break;
    }

  return false;
}