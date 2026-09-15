import { DayOfWeek, ScheduleException, TimeInterval, WeeklySchedule } from "../models/models"

export interface OpenStatusResult {
  isOpen: boolean
  changesAt?: Date
}

export function getZonedNow(timezone: string) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now)

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]))

  return {
    date: `${map["year"]}-${map["month"]}-${map["day"]}`,
    dayOfWeek: map["weekday"],
    time: `${map["hour"]}:${map["minute"]}`,
    dateTime: new Date(`${map["year"]}-${map["month"]}-${map["day"]}T${map["hour"]}:${map["minute"]}:${map["second"]}`)
  }
}

function weekdayToEnum(weekday: string): DayOfWeek {
  return ({
    Mon: DayOfWeek.Monday,
    Tue: DayOfWeek.Tuesday,
    Wed: DayOfWeek.Wednesday,
    Thu: DayOfWeek.Thursday,
    Fri: DayOfWeek.Friday,
    Sat: DayOfWeek.Saturday,
    Sun: DayOfWeek.Sunday
  } as any)[weekday]
}

function exceptionAppliesToday(
  ex: ScheduleException,
  today: string
): boolean {
  const rule = ex.appliesTo

  switch (rule.type) {
    case 'oneOff':
      return rule.date === today

    case 'range':
      return today >= rule.startDate && today <= rule.endDate

    case 'annual': {
      const [y, m, d] = today.split('-').map(Number)
      return rule.month === m && rule.day === d
    }
  }
}

export function getStudioOpenStatus(
  timezone: string,
  weeklySchedules: WeeklySchedule[],
  exceptions: ScheduleException[]
): OpenStatusResult {

  const zoned = getZonedNow(timezone)
  const today = zoned.date
  const nowMinutes = toMinutes(zoned.time)
  const todayDow = weekdayToEnum(zoned.dayOfWeek)

  /** 1️⃣ Check exceptions (highest priority) */
  const activeException = exceptions.find(ex =>
    exceptionAppliesToday(ex, today)
  )

  if (activeException) {
    if (activeException.isClosed) {
      return { isOpen: false }
    }

    return evaluateIntervals(
      activeException.intervals ?? [],
      nowMinutes,
      today,
      timezone
    )
  }

  const activeSchedules = weeklySchedules.filter(s => {
    const hasEffectiveFrom = !!s.effectiveFrom;
    const hasEffectiveTo = !!s.effectiveTo;
    
    const v1 = !hasEffectiveFrom;
    const v2 = !hasEffectiveTo;
    const v3 = hasEffectiveTo && (today <= s.effectiveTo!);
    const v4 = hasEffectiveFrom && (today >= s.effectiveFrom!);

    if((v1 || v4) && (v2 || v3)) return true;
    return false;
  })

  const todayRules = activeSchedules
    .flatMap(s => s.days)
    .filter(d => d.dayOfWeek === todayDow)

  if (!todayRules.length || todayRules.every(d => d.isClosed)) {
    return { isOpen: false }
  }

  const intervals = todayRules
    .flatMap(d => d.intervals ?? [])

  return evaluateIntervals(intervals, nowMinutes, today, timezone)
}

function evaluateIntervals(
  intervals: TimeInterval[],
  nowMinutes: number,
  today: string,
  timezone: string
): OpenStatusResult {

  const sorted = intervals
    .map(i => ({
      start: toMinutes(i.start),
      end: toMinutes(i.end)
    }))
    .sort((a, b) => a.start - b.start)

  for (const i of sorted) {

    if (nowMinutes >= i.start && nowMinutes < i.end) {
      return {
        isOpen: true,
        changesAt: nozoneDate(today, i.end)
      }
    }
  }

  const next = sorted.find(i => i.start > nowMinutes)
  if (next) {
    return {
      isOpen: false,
      changesAt: nozoneDate(today, next.start)
    }
  }

  return { isOpen: false }
}

export function nozoneDate(
  date: string,
  minutes: number
): Date {
  const [year, month, day] = date.split('-').map(Number);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return new Date(year, month - 1, day, hours, mins, 0, 0);
}

export function zonedDate(
  date: string,
  minutes: number,
  timezone: string
): Date {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60

  const iso = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`

  return new Date(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date(iso))
  )
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}