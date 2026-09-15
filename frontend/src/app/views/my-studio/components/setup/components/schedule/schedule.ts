// schedule.ts
import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { Button } from "../../../../../../components/common/button/button";
import { TimeInput } from "../../../../../../components/common/time-input/time-input";
import { Checkbox } from "../../../../../../components/common/checkbox/checkbox";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { DAY_KEYS, setup_errors } from '../../../../../../CONST';
import { isOwner, RequestState, Studio, WeeklySchedule } from '../../../../../../models/models';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { FormsModule } from '@angular/forms';
import { DateSelect } from "../../../../../../components/common/date-select/date-select";
import { NotifyMessage } from "../../../../../../components/common/notify-message/notify-message";
import { getZonedNow, toMinutes, zonedDate } from '../../../../../../util/studio_hours';
import { formatDate } from '@angular/common';

@Component({
  selector: 'setup-schedule',
  imports: [Button, TimeInput, Checkbox, ErrorMessage, RequestStatusMessage, FormsModule, DateSelect, NotifyMessage],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setup = inject(SetupService);

  readonly next = output<void>();
  readonly vm = this.setup.scheduleVm;

  readonly saveRequestState = signal<RequestState<WeeklySchedule[]>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.saveRequestState().status);

  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['schedule'];
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
  });

  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.SCHEDULE.TITLE');
  });
  readonly timeZone = computed<string | null>(()=>{    
    const owner = this.singleProvider.selected();
    if(!owner || !isOwner(owner)) return null;
    const studio = this.singleProvider.activeStudio();
    if(!studio) return null;

    return studio.timeZone;
  });

  readonly notifyTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ALERTS.WARNING')
  })

  readonly notifyBody = computed<string[]>(() => {
    const owner = this.singleProvider.selected();
    if (!owner || !isOwner(owner)) return [];
    
    const tz = this.timeZone();
    if(!tz) return []

    const schedules = this.schedules();
    const now = getZonedNow(tz);
    const reservations = this.singleProvider.activeOwnerReservations()
    .filter(i => 
      i.timeslot.date > now.date ||
      ( i.timeslot.date === now.date && toMinutes(i.timeslot.start) >= toMinutes(now.time) )
    )
    .sort((a, b) => {
      const dateA = a.timeslot.date;
      const dateB = b.timeslot.date;
      if (dateA !== dateB) { return dateA > dateB ? 1 : -1; }
      return toMinutes(a.timeslot.start) - toMinutes(b.timeslot.start);
    });;

    const warningList: string[] = [];

    for (const reservation of reservations) {
      const { date, start } = reservation.timeslot;



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

      if (!governingSchedule) continue;

      const dateObj = zonedDate(date, toMinutes(start), reservation.timeZone);
      const dayKey = DAY_KEYS[dateObj.getDay()];
      const matchingDay = governingSchedule.days?.find(
        (day) => day.day === dayKey
      );

      const isStillCovered = (() => {
        if (!matchingDay || !matchingDay.open) return false;

        return matchingDay.intervals?.some((interval) => {
          if (!interval.start || !interval.end) return false;
          return start >= interval.start && start < interval.end;
        });
      })();

      if (!isStillCovered) {
        warningList.push(
          `${reservation.articleName} - ${this.formatDate(date)} ${start} `
        );
      }
    }

    return warningList;
  });

  readonly hasNotification = computed(() => {
    return !!this.notifyBody().length;
  })

  readonly errorBody = computed<string[]>(() => {
    const errorMessages = this.errors();
    const schedules = this.vm().value.schedules ?? [];
    const form = this.vm().form;

    const rootErrors = form.errors;
    const schedulesArray = form.controls.schedules;

    const errorList: string[] = [];

    /* ------------------------------
      Root (array-level) errors
    ------------------------------ */
    if (rootErrors) {
      for (const key of [
        'invalidSchedulesArray',
        'missingSchedules',
        'emptySchedules'
      ] as const) {
        if (rootErrors[key]) {
          const message = errorMessages[key];
          if (message) errorList.push(message);
        }
      }

      const arrayScheduleErrors = rootErrors['schedules'];
      if (Array.isArray(arrayScheduleErrors)) {
        arrayScheduleErrors.forEach((scheduleError, si) => {
          if (!scheduleError) return;

          const schedulePrefix =
            si === 0
              ? ''
              : `${this.translate.translate('SETUP.SCHEDULE.SCHEDULE')} ${si + 1}: `;

          for (const key of [
            'missingEffectiveFrom',
            'effectiveFromInvalidFormat',
            'missingEffectiveTo',
            'effectiveToInvalidFormat',
            'effectiveRangeInvalid'
          ] as const) {
            if (scheduleError[key]) {
              const message = errorMessages[key];
              if (message) errorList.push(`${schedulePrefix}${message}`);
            }
          }
        });
      }
    }

    /* ------------------------------
      Schedule / Day / Interval errors
      (from child validators)
    ------------------------------ */
    schedulesArray.controls.forEach((scheduleControl, si) => {
      const scheduleErrors = scheduleControl.errors;
      if (!scheduleErrors) return;

      const schedulePrefix =
        si === 0
          ? ''
          : `${this.translate.translate('SETUP.SCHEDULE.SCHEDULE')} ${si + 1}: `;

      /* schedule-level */
      for (const key of ['invalidSchedule', 'invalidDaysAmount'] as const) {
        if (scheduleErrors[key]) {
          const message = errorMessages[key];
          if (message) errorList.push(`${schedulePrefix}${message}`);
        }
      }

      const dayErrors = scheduleErrors['days'];
      if (!Array.isArray(dayErrors)) return;

      dayErrors.forEach((dayError, di) => {
        if (!dayError) return;

        const dayName = schedules[si]?.days?.[di]?.day
          ? this.getDayName()(schedules[si].days[di].day!)
          : `Day ${di + 1}`;

        const dayPrefix = `${schedulePrefix}${dayName}`;

        Object.entries(dayError as Record<string, unknown>).forEach(
          ([errorKey, errorValue]) => {
            if (errorKey === 'intervals' && Array.isArray(errorValue)) {
              errorValue.forEach((intervalError, ii) => {
                if (!intervalError) return;

                Object.keys(intervalError as Record<string, unknown>).forEach(
                  iErrorKey => {
                    const message = errorMessages[iErrorKey];
                    if (message) {
                      errorList.push(
                        `${dayPrefix}, ${this.getIntervalText()} ${ii + 1}: ${message}`
                      );
                    }
                  }
                );
              });
              return;
            }

            const message = errorMessages[errorKey];
            if (message) errorList.push(`${dayPrefix}: ${message}`);
          }
        );
      });
    });

    return errorList;
  });
  /**
   * Per-schedule, per-day (and per-interval) error highlight index.
   * Shape: hasErrorIndex()[scheduleIndex][dayIndex].self / .intervals[intervalIndex]
   */
  readonly hasAnyError = computed<(scheduleIndex: number) => boolean>(() => {
    const ei = this.hasErrorIndex();
    return (scheduleIndex: number) => ei[scheduleIndex]?.some(day => day.self) ?? false;
  });

  readonly hasErrorIndex = computed<{ self: boolean; intervals: boolean[] }[][]>(() => {
    const schedules = this.vm().value.schedules ?? [];
    const schedulesArray = this.vm().form.controls.schedules;

    // Default structure (mirrors value)
    const result: { self: boolean; intervals: boolean[] }[][] = schedules.map(s =>
      (s.days ?? []).map(d => ({
        self: false,
        intervals: (d.intervals ?? []).map(() => false),
      }))
    );

    schedulesArray.controls.forEach((scheduleControl, si) => {
      const scheduleErrors = scheduleControl.errors;
      if (!scheduleErrors || !result[si]) return;

      const dayErrors = scheduleErrors['days'];
      if (!Array.isArray(dayErrors)) return;

      dayErrors.forEach((dayError, di) => {
        if (!dayError || !result[si][di]) return;

        // mark day itself
        result[si][di].self = true;

        const intervalErrors = (dayError as Record<string, unknown>)['intervals'];
        if (Array.isArray(intervalErrors)) {
          intervalErrors.forEach((intervalError, ii) => {
            if (intervalError && result[si][di].intervals[ii] !== undefined) {
              result[si][di].intervals[ii] = true;
            }
          });
        }
      });
    });

    return result;
  });

  readonly viewInvalid = computed(() => this.vm().state === 'invalid');

  readonly schedules = computed(() => this.vm().value.schedules ?? []);

  // ── Translated labels ────────────────────────────────────────────────────────

  readonly getTitle = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.TITLE');
  });

  readonly getPar1 = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.PAR1');
  });

  readonly getSaveButtonText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.SAVE');
  });

  readonly getAddButtonText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.ADD_INTERVAL');
  });

  readonly getAddScheduleButtonText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.ADD_SCHEDULE');
  });

  readonly getNextButtonText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.NEXT');
  });

  readonly getOpenText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.OPEN_DAYS');
  });

  readonly getDayName = computed(() => {
    const _ = this.translate.userLang();
    return (day: string) => this.translate.translate(day);
  });

  readonly getstartText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.START_TIME');
  });

  readonly getendText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.END_TIME');
  });

  readonly getIntervalText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.INTERVAL');
  });

  readonly getScheduleText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.SCHEDULE');
  });

  readonly getDefineIntervalText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.DEFINE_INTERVAL');
  });

  readonly getEffectiveFromText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.EFFECTIVE_FROM');
  });

  readonly getEffectiveToText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.EFFECTIVE_TO');
  });

  readonly getRemoveScheduleText = computed(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.REMOVE_SCHEDULE');
  });

  // ── Mutations ────────────────────────────────────────────────────────────────

  readonly monthNames = this.translate.shortMonthNames;
  private formatDate(yyyymmdd: string): string {
    // e.g. "2025-07-14" → "14 July 2025"
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const monthName = this.monthNames()[month - 1] ?? '';
    return `${day} ${monthName} ${year}`;
  }
  addSchedule() {
    const timeZone = this.timeZone();
    if(!timeZone) return;
    this.setup.addSchedule(timeZone);
  }

  removeSchedule(scheduleIndex: number) {
    this.setup.removeSchedule(scheduleIndex);
  }

  setEffectiveFrom(scheduleIndex: number, value: string) {
    this.setup.setEffectiveFrom(scheduleIndex, value || null);
  }

  setEffectiveTo(scheduleIndex: number, value: string) {
    this.setup.setEffectiveTo(scheduleIndex, value || null);
  }

  setDayOpen(scheduleIndex: number, day: number, value: boolean) {
    this.setup.setDayOpen(scheduleIndex, day, value);
  }

  addInterval(scheduleIndex: number, day: number) {
    this.setup.addInterval(scheduleIndex, day);
  }

  removeInterval(scheduleIndex: number, day: number, interval: number) {
    this.setup.removeInterval(scheduleIndex, day, interval);
  }

  onIntervalStartChange(scheduleIndex: number, day: number, interval: number, start: string) {
    this.setup.setIntervalStart(scheduleIndex, day, interval, start);
  }

  onIntervalEndChange(scheduleIndex: number, day: number, interval: number, end: string) {
    this.setup.setIntervalEnd(scheduleIndex, day, interval, end);
  }

  save() {
    if (!this.viewInvalid()) {
      this.setup.saveSchedules().subscribe({
        next: (value) => {
          this.saveRequestState.set(value);
          if (value.status === 'success') {
            const active = this.singleProvider.activeStudio()!;
            const updatedStudio: Studio = { ...active, weeklySchedules: value.data };
            this.singleProvider.update(updatedStudio);
            this.setup.markAsSaved('schedule');
          }
        },
        error: (err) => console.error(err),
      });
    }
  }

    
  /* ---------------------------------------------------
    EXPANSION STATE (Signal-Based)
  --------------------------------------------------- */


  readonly singleExpandMode = true;

  private readonly expandedSingle = signal<string | null>(null);
  private readonly expandedMulti = signal<Set<string>>(new Set());

  isExpanded(localId: string): boolean {
    if (this.singleExpandMode) {
      return this.expandedSingle() === localId;
    }
    return this.expandedMulti().has(localId);
  }

  expandSchedule(localId: string): void {
    if (this.singleExpandMode) {
      this.expandedSingle.set(localId);
      return;
    }

    this.expandedMulti.update(prev => {
      if (prev.has(localId)) return prev;
      const next = new Set(prev);
      next.add(localId);
      return next;
    });
  }

  collapseSchedule(localId: string): void {
    if (this.singleExpandMode) {
      if (this.expandedSingle() !== localId) return;
      this.expandedSingle.set(null);
      return;
    }

    this.expandedMulti.update(prev => {
      if (!prev.has(localId)) return prev;
      const next = new Set(prev);
      next.delete(localId);
      return next;
    });
  }

  toggleSchedule(localId: string): void {
    this.isExpanded(localId)
      ? this.collapseSchedule(localId)
      : this.expandSchedule(localId);
  }
}