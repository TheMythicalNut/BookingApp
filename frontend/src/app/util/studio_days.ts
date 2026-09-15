/********************************************************************
 *  Studio week formatter
 *******************************************************************/
import {
  DayOfWeek,
  ScheduleException,
  TimeInterval,
  WeeklySchedule,
  OneOffDate,
  DateRange,
  AnnualRecurringDate,
} from '../models/models'; // <-- your file
import { zonedDate } from './studio_hours';

const DAY_NAMES = [
  'DATE.MONDAY',
  'DATE.TUESDAY',
  'DATE.WEDNESDAY',
  'DATE.THURSDAY',
  'DATE.FRIDAY',
  'DATE.SATURDAY',
  'DATE.SUNDAY',
] as const;

type WorkingDay = {
  name: string;
  intervals: TimeInterval[];
};

/**
 * Return the “simple” human string for the studio’s current working week.
 * If no schedule is active → "Closed: No active schedule".
 * If every day is closed → "Closed: All week".
 */
export function formatCurrentWeek(
  timezone: string,
  weeklySchedules: WeeklySchedule[],
  exceptions: ScheduleException[],
): string {
  const today = toTZDate(new Date(), timezone); // 2026-01-18 in your TZ
  const active = pickActiveSchedule(weeklySchedules, timezone, today);
  if (!active) return 'MESSAGES.CLOSED_ALL_WEEK';

  // Build working week (Mon…Sun) from the schedule
  const weekDays: WorkingDay[] = [];
  for (let dow = DayOfWeek.Monday; dow <= DayOfWeek.Sunday; ++dow) {
    const daySched = active.days.find(d => d.dayOfWeek === dow);
    if (!daySched || daySched.isClosed) continue;
    weekDays.push({
      name: DAY_NAMES[dow - 1],
      intervals: daySched.intervals || [],
    });
  }

  // Apply exceptions for every concrete date of this week
  const weekDates = datesOfWeek(today);
  weekDays.forEach((wd, idx) => {
    const date = weekDates[idx];
    wd.intervals = applyExceptions(wd.intervals, date, exceptions);
  });

  // Remove fully-closed days
  const openDays = weekDays.filter(d => d.intervals.length > 0);
  if (openDays.length === 0) return 'MESSAGES.CLOSED_ALL_WEEK';

  // Group consecutive days with identical intervals
  const groups: { days: string[]; intervals: TimeInterval[] }[] = [];
  for (const d of openDays) {
    const last = groups[groups.length - 1];
    if (last && intervalsEqual(last.intervals, d.intervals)) {
      last.days.push(d.name);
    } else {
      groups.push({ days: [d.name], intervals: d.intervals });
    }
  }

  /* ----------  NEW: build condensed day-ranges for the header line ---------- */
  const openDayNames = openDays.map(d => d.name);
  const headerRanges = collapseDayNames(openDayNames); // e.g. ["Monday-Saturday"]

  /* ----------  build the body lines (unchanged logic) ---------- */
  const lines: string[] = [];
  groups.forEach(g => {
    const dayRange =
      g.days.length === 1 ? g.days[0] : `${g.days[0]}-${g.days[g.days.length - 1]}`;
    const hours = g.intervals.map(i => `${i.start}-${i.end}`).join(', ');
    lines.push(`${dayRange} ${hours}`);
  });

  return `MESSAGES.OPEN_DAYS ${headerRanges.join(',')}\n${lines.join('\n')}`;
}

/* -------------------------------------------------------------- */
/* helpers                                                        */
/* -------------------------------------------------------------- */

/** Return the schedule whose effective period contains today (or no bounds). */
function pickActiveSchedule(
  weeklySchedules: WeeklySchedule[],
  timezone: string,
  date: Date,
): WeeklySchedule | null {
  const dateISO = date.toISOString();
  const activeSchedules = weeklySchedules.filter(s => {
    const hasEffectiveFrom = !!s.effectiveFrom;
    const hasEffectiveTo = !!s.effectiveTo;
    const effectiveFrom = hasEffectiveFrom? zonedDate(s.effectiveFrom!, 0, timezone).toISOString() : '';
    const effectiveTo =  hasEffectiveTo? zonedDate(s.effectiveTo ?? '', 0, timezone).toISOString() : '';
    
    const v1 = !hasEffectiveFrom;
    const v2 = !hasEffectiveTo;
    const v3 = hasEffectiveTo && (dateISO <= effectiveTo);
    const v4 = hasEffectiveFrom && (dateISO >= effectiveFrom);

    if((v1 || v4) && (v2 || v3)) return true;
    return false;
  })
  return activeSchedules[0] ?? null;
}

/** Return [Mon-date, …, Sun-date] for the week that contains `date`. */
function datesOfWeek(date: Date): Date[] {
  const mon = new Date(date);
  const day = mon.getDay(); // 0=Sun…6=Sat
  const diff = mon.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
  mon.setDate(diff);
  const arr: Date[] = [];
  for (let i = 0; i < 7; i++) {
    arr.push(new Date(mon));
    mon.setDate(mon.getDate() + 1);
  }
  return arr;
}

/** Return intervals after removing parts overridden by exceptions. */
function applyExceptions(
  base: TimeInterval[],
  date: Date,
  exceptions: ScheduleException[],
): TimeInterval[] {
  const ymd = toYYYY_MM_DD(date);
  const hits = exceptions.filter(ex => exceptionApplies(ex.appliesTo, ymd));
  if (hits.length === 0) return base;

  // If any hit forces full-day closed → nothing left
  if (hits.some(h => h.isClosed)) return [];

  // Collect all override intervals (union)
  const overrideIntervals = hits.flatMap(h => h.intervals || []);
  if (overrideIntervals.length === 0) return base;

  // For simplicity we just return the override intervals;
  // if you need intersection with base instead, swap here.
  return overrideIntervals;
}

/** Does the exception rule cover the concrete date? */
function exceptionApplies(
  rule: OneOffDate | DateRange | AnnualRecurringDate,
  ymd: string,
): boolean {
  if (rule.type === 'oneOff') return rule.date === ymd;
  if (rule.type === 'range') return rule.startDate <= ymd && ymd <= rule.endDate;
  // annual
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  return rule.month === m && rule.day === d;
}

/** Compare two interval arrays for equality (order-insensitive). */
function intervalsEqual(a: TimeInterval[], b: TimeInterval[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x.start.localeCompare(y.start));
  const sb = [...b].sort((x, y) => x.start.localeCompare(y.start));
  return sa.every((v, i) => v.start === sb[i].start && v.end === sb[i].end);
}

/** Convert JS-Date to YYYY-MM-DD in the given tz. */ // Time ZOne
export function toYYYY_MM_DD(d: Date, tz?: string): string {
  return (tz? toTZDate(d, tz) : d).toISOString().slice(0, 10);
}

export function dateToYYYYMMDD(date: Date): string { // DIRECT COPY, NO TIMEZONES
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Return a Date object whose *local* calendar is the calendar of `tz`. */
export function toTZDate(d: Date, tz: string): Date {
  // Cheap trick: format the moment in the target tz, then parse back
  const wallTime = d.toLocaleString('sv-SE', { timeZone: tz }); // "YYYY-MM-DD HH:mm:ss"
  return new Date(wallTime.replace(' ', 'T') + 'Z');
}

function collapseDayNames(names: string[]): string[] {
  if (!names.length) return [];
  const order = DAY_NAMES; // same order as enum
  const idx = names.map(n => order.indexOf(n as any)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = idx[0];
  let prev = start;
  for (let i = 1; i <= idx.length; i++) {
    if (i < idx.length && idx[i] === prev + 1) {
      prev++;
    } else {
      const startName = order[start];
      const endName = order[prev];
      ranges.push(start === prev ? startName : `${startName}-${endName}`);
      start = prev = idx[i];
    }
  }
  return ranges;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function generateMonthDays(year: number = new Date().getFullYear()): number[][] {
  const isLeapYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

  const daysPerMonth = [
    31,                        // January
    isLeapYear ? 29 : 28,      // February
    31,                        // March
    30,                        // April
    31,                        // May
    30,                        // June
    31,                        // July
    31,                        // August
    30,                        // September
    31,                        // October
    30,                        // November
    31                         // December
  ];

  return daysPerMonth.map(days =>
    Array.from({ length: days }, (_, i) => i + 1)
  );
}