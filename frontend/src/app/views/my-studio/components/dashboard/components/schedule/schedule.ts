import { Component, computed, inject, signal } from '@angular/core';
import { RequestState, Reservation, reservation_status, TimeInterval, timeslot, WeeklySchedule } from '../../../../../../models/models';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { CommonModule } from '@angular/common';
import { getZonedNow, minutesToTime, toMinutes, zonedDate } from '../../../../../../util/studio_hours';
import { TranslationService } from '../../../../../../services/translation/translation';
import { dateToYYYYMMDD } from '../../../../../../util/studio_days';
import { HourLabelPipe } from '../../../../../../pipes/hour-label-pipe';
import { Button } from "../../../../../../components/common/button/button";
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { UnifiedSetter } from '../../../../../../services/unified/unified-setter';
import { TimeInput } from "../../../../../../components/common/time-input/time-input";
import { DateSelect } from "../../../../../../components/common/date-select/date-select";
import { isValidISODate, isValidTime } from '../../../../../../util/email_validator';
import { Router } from '@angular/router';
import { DAY_KEYS } from '../../../../../../CONST';

// ── Layout helpers ────────────────────────────────────────────────────────────

interface ReservationViewModel {
  id: string;
  status: string;
  articleName: string;
  startDisplay: string;
  endDisplay: string;
  userPhone: string;
  userEmail: string;
  startMinutes: number;
  endMinutes: number;
  /** Top position as a percentage of the 24-hour column */
  topPercent: number;
  /** Height as a percentage of the 24-hour column */
  heightPercent: number;
  /** Left offset (%) for overlap columns — 0 when no overlap */
  columnOffset: number;
  /** Width (%) for overlap columns — 100 when no overlap */
  columnWidth: number;
}

const MINUTES_IN_DAY = 1440;
const OVERLAP_GUTTER_PX = 2; // visual breathing room between side-by-side blocks

// ── Overlap resolution ────────────────────────────────────────────────────────

/**
 * Groups reservations into columns so that overlapping blocks are placed
 * side-by-side rather than stacked on top of each other.
 *
 * Algorithm: classic interval-graph colouring (greedy, single-pass).
 */
function resolveOverlaps(
  reservations: Omit<ReservationViewModel, 'columnOffset' | 'columnWidth'>[],
): ReservationViewModel[] {
  if (!reservations.length) return [];

  // Sort by start time so we can process in order
  const sorted = [...reservations].sort(
    (a, b) => a.startMinutes - b.startMinutes,
  );

  // column[i] = end minute of the last block placed in column i
  const columns: number[] = [];
  const assigned: { item: typeof sorted[0]; col: number }[] = [];

  for (const item of sorted) {
    // Find the first column whose last block has already ended
    let col = columns.findIndex(endMin => endMin <= item.startMinutes);
    if (col === -1) {
      col = columns.length;
      columns.push(item.endMinutes);
    } else {
      columns[col] = item.endMinutes;
    }
    assigned.push({ item, col });
  }

  const totalCols = columns.length;

  return assigned.map(({ item, col }) => ({
    ...item,
    columnOffset: totalCols === 1 ? 0 : (col / totalCols) * 100,
    columnWidth:
      totalCols === 1 ? 100 : (1 / totalCols) * 100 - OVERLAP_GUTTER_PX,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'dashboard-schedule',
  imports: [CommonModule, HourLabelPipe],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly translate = inject(TranslationService);
  private readonly setter = inject(UnifiedSetter);
  private readonly router = inject(Router);

  // ── Raw data ──────────────────────────────────────────────────────────────

  readonly reservations = this.singleProvider.activeOwnerReservations;
  readonly studio = this.singleProvider.activeStudio;

  // ── Static constants ──────────────────────────────────────────────────────

  readonly hours: number[] = Array.from({ length: 24 }, (_, i) => i);
  readonly monthNames = this.translate.shortMonthNames;

  // ── State signals ─────────────────────────────────────────────────────────

  readonly currentDate = signal<Date>(this.initCurrentDate());
  readonly selectedWeekDay = signal<Date>(this.initPeriodStart());

  readonly confirmRequest = signal<{id: string, status: reservation_status} | undefined>(undefined);
  readonly confirmRequestState = signal<RequestState<Reservation>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.confirmRequestState().status);
  readonly activatedReservationId = signal<string | undefined>(undefined);

  readonly rescheduleRequest = signal<{id: string, timeslot: timeslot} | undefined>(undefined);
  readonly rescheduleRequestState = signal<RequestState<Reservation>>({status: 'idle'});
  readonly rescheduleStatus = computed(() => this.rescheduleRequestState().status);
  readonly rescheduleDisabled = computed<boolean>(() => {
    const timeZone = this.studio()?.timeZone;
    if(!timeZone) return true;
    const timeslot = this.rescheduleRequest()?.timeslot;
    if(!timeslot) return true;
    const currentId = this.activatedReservationId();
    if(!currentId) return true;
    const current = this.filteredReservations().find(it => it.id === currentId);
    if(!current) return true;
    if(timeslot.date === current.timeslot.date && timeslot.start === current.timeslot.start) return true;
    const today = getZonedNow(timeZone);
    if(timeslot.date < today.date || ( timeslot.date === today.date && toMinutes(timeslot.start) <= toMinutes(today.time) ) ) return true;
    return false; 
  })
  readonly activatedRescheduleId = signal<string | undefined>(undefined);

  // ── Period bounds ─────────────────────────────────────────────────────────

  readonly periodStart = computed<Date>(() => {
    const d = this.currentDate();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  });

  readonly periodEnd = computed<Date>(() => {
    const d = this.currentDate();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  });

  // ── Label (consumed directly in template — no function call) ──────────────

  readonly visiblePeriodLabel = computed<string>(() =>
    this.formatDate(dateToYYYYMMDD(this.periodStart())),
  );

  // ── Calendar helpers ──────────────────────────────────────────────────────

  readonly monthDays = computed<Date[]>(() => {
    const start = startOfMonth(this.currentDate());
    const end = endOfMonth(this.currentDate());
    const days: Date[] = [];
    const d = new Date(start);
    while (d <= end) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  });

  readonly weekDays = computed<Date[]>(() =>
    Array.from({ length: 7 }, (_, i) => addDays(this.periodStart(), i)),
  );

  // ── Filtered reservations ─────────────────────────────────────────────────

  private readonly VISIBLE_STATUSES = new Set([
    'CONFIRMED',
    'PENDING_CONFIRMATION',
    'COMPLETED',
  ]);

  readonly filteredReservations = computed<Reservation[]>(() => {
    const startDay = new Date(this.periodStart());
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(this.periodEnd());
    endDay.setHours(23, 59, 59, 999);

    return this.reservations().filter(s => {
      const d = new Date(s.timeslot.date);
      d.setHours(0, 0, 0, 0);
      return (
        d >= startDay &&
        d <= endDay &&
        this.VISIBLE_STATUSES.has(s.status.status)
      );
    });
  });

  // ── View models (layout-ready, with overlap resolution) ───────────────────

  readonly activeSchedule = computed<WeeklySchedule | undefined>(() => {
    const studio = this.studio();
    if(!studio) return undefined;
    const schedules = studio.weeklySchedules;
    
    const startDay = new Date(this.periodStart());
    startDay.setHours(0, 0, 0, 0);

    const date = dateToYYYYMMDD(startDay);


    const governingSchedule = schedules
      .filter((schedule) => {
        const afterFrom = schedule.effectiveFrom ? date >= schedule.effectiveFrom : true;
        const beforeTo = schedule.effectiveTo ? date <= schedule.effectiveTo : true;
        return afterFrom && beforeTo;
      })
      .sort((a, b) => {
        const aIsDefault = !a.effectiveFrom && !a.effectiveTo;
        const bIsDefault = !b.effectiveFrom && !b.effectiveTo;
        if (aIsDefault && !bIsDefault) return 1;
        if (!aIsDefault && bIsDefault) return -1;
        return 0;
      })[0];

    return !!governingSchedule? governingSchedule : undefined;
  });

  readonly currentDayIntervals = computed<TimeInterval[]>(() => {
    const studio = this.studio();
    if(!studio) return [];
    const tz = studio.timeZone;
    const as = this.activeSchedule();
    if(!as) return [];
    
    const startDay = new Date(this.periodStart());
    startDay.setHours(0, 0, 0, 0);

    const matchingDay = as.days?.find(
      (day) => (day.dayOfWeek % 7) === startDay.getDay()
    );

    
    return matchingDay?.intervals ?? [];
  })

  readonly currentDayIntervalsPositions = computed(() => {
    const cdi = this.currentDayIntervals();
    const total = this.hours.length * 60; // each hour = one equal flex row
    const gridStart = this.hours[0] * 60;
    const PADDING = 0.8;
    return cdi.map(i => {
      const start = toMinutes(i.start) - gridStart;
      const end = toMinutes(i.end) - gridStart;
      const top = (start / total) * 100 - PADDING;
      const height = ((end - start) / total) * 100 + PADDING * 2;
      return { top, height };
    })
  })

  readonly currentDayReservations = computed<ReservationViewModel[]>(() => {
    const raw = this.filteredReservations().map(r => {
      const startMinutes = toMinutes(r.timeslot.start);
      const duration = r.duration ?? 0;
      const endMinutes = startMinutes + duration;

      return {
        id: r.id,
        status: r.status.status,
        articleName: r.articleName ?? '',
        userPhone: r.userPhone ?? '',
        userEmail: r.userEmail ?? '',
        startDisplay: minutesToTime(startMinutes),
        endDisplay: minutesToTime(endMinutes),
        startMinutes,
        endMinutes,
        topPercent: (startMinutes / MINUTES_IN_DAY) * 100,
        heightPercent: Math.max((duration / MINUTES_IN_DAY) * 100, 1), // min 1% so 0-min blocks are visible
      };
    });

    return resolveOverlaps(raw);
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  previousPeriod(): void {
    this.currentDate.update(d => {
      const next = new Date(d);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }

  nextPeriod(): void {
    this.currentDate.update(d => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }

  goToToday(): void {
    this.currentDate.set(this.initCurrentDate());
  }
  
  rescheduleRes(id: string) {
    const res = this.filteredReservations().find(i => i.id === id);
    if(!res) return;
    this.rescheduleRequest.set({id: id, timeslot: res.timeslot});
  }

  setRescheduleDate(date: string) {
    this.rescheduleRequest.update(i => i ? { id: i.id, timeslot: { date: date, start: i.timeslot.start} } : undefined )
  }
  
  setRescheduleStart(start: string) {
    this.rescheduleRequest.update(i => i ? { id: i.id, timeslot: { date: i.timeslot.date, start: start} } : undefined )
  }

  updateResStatus(id: string, status: reservation_status) {
    this.confirmRequest.set({id, status});
  }

  confirmUpdateResStatus(){
    const payload = this.confirmRequest();
    if(payload && payload.id){
      this.setter.update('reservation', {
        id: payload.id,
        status: { status: payload.status }
      }).subscribe({
        next: (value) => {
          this.confirmRequestState.set(value);
          if(value.status === 'success'){
            this.singleProvider.update(value.data);
            this.confirmRequestState.set({status: 'idle'});
          }
        },
        error: (err) => { console.error(err); }
      })
    }
  }
  
  cancelUpdateResStatus(){
    this.confirmRequest.set(undefined);
  }

  confirmReschedule(){
    const payload = this.rescheduleRequest();
    if(payload && 
      payload.id && 
      isValidISODate(payload.timeslot.date) && 
      isValidTime(payload.timeslot.start)){
        this.setter.update('reservation', {
          id: payload.id,
          timeslot: payload.timeslot
        }).subscribe({
          next: (value) => {
            this.rescheduleRequestState.set(value);
            if(value.status === 'success'){
              this.singleProvider.update(value.data);
              this.rescheduleRequestState.set({status: 'idle'});
            }
          },
          error: (err) => { console.error(err); }
        })
    } 
  }

  cancelReschedule(){
    this.rescheduleRequest.set(undefined);
  }

  activateReservation(id: string) {
    const cur_id = this.activatedReservationId();
    this.activatedReservationId.set(cur_id === id ? undefined: id);
  }
  
  navReservation(resID: string){
    this.router.navigate([`reservation/${resID}`]);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private initCurrentDate(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private initPeriodStart(): Date {
    return this.initCurrentDate();
  }

  private formatDate(yyyymmdd: string): string {
    // e.g. "2025-07-14" → "14 July 2025"
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const monthName = this.monthNames()[month - 1] ?? '';
    return `${day} ${monthName} ${year}`;
  }



  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);

  readonly getToday = computed(() => {
    this.lang();
    return this.tr('DATE.TODAY');
  })

  readonly getRescheduleButtonTitle = computed(() => {
    this.lang();
    return this.tr('BUTTON.RESCHEDULE');
  })
  readonly getOwnerCancelledButtonTitle = computed(() => {
    this.lang();
    return this.tr('BUTTON.MARK_CANCELLED');
  })

  readonly getEmptyScheduleText = computed(() => {
    this.lang();
    return this.tr('DASHBOARD.SCHEDULE.EMPTY_SCHEDULE');
  })

  readonly getConfirmButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.CONFIRM');
  })
  
  readonly getCancelButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.CANCEL');
  })
  readonly getDateText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DATE.DATE');
  })
  readonly getStartText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.START_TIME');
  })
  
  readonly getModifyButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.MODIFY');
  })
  
}


function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}
 
function startOfWeek(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}
 
function endOfWeek(d: Date): Date {
  return addDays(startOfWeek(d), 6);
}
 
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
 
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}