import { Component, computed, inject, output, Signal, signal } from '@angular/core';
import { Button } from "../../../../../../components/common/button/button";
import { SetupService } from '../../../../../../services/setup-service/setup-service';
import { TranslationService } from '../../../../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { isOwner, RequestState, ScheduleException, Studio } from '../../../../../../models/models';
import { TextField } from "../../../../../../components/common/text-field/text-field";
import { Checkbox } from "../../../../../../components/common/checkbox/checkbox";
import { TimeInput } from "../../../../../../components/common/time-input/time-input";
import { Select } from "../../../../../../components/common/select/select";
import { generateMonthDays } from '../../../../../../util/studio_days';
import { DateSelect } from "../../../../../../components/common/date-select/date-select";
import { ErrorMessage } from "../../../../../../components/common/error-message/error-message";
import { setup_errors } from '../../../../../../CONST';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { getZonedNow, toMinutes } from '../../../../../../util/studio_hours';
import { NotifyMessage } from "../../../../../../components/common/notify-message/notify-message";

@Component({
  selector: 'setup-schedule-exceptions',
  imports: [Button, TextField, Checkbox, TimeInput, Select, DateSelect, ErrorMessage, RequestStatusMessage, NotifyMessage],
  templateUrl: './schedule-exceptions.html',
  styleUrl: './schedule-exceptions.css',
})
export class ScheduleExceptions {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setup = inject(SetupService);

  readonly next = output<void>();
  readonly vm = this.setup.exceptionsVm;

  readonly saveRequestState = signal<RequestState<ScheduleException[]>>({status: 'idle'});
  readonly requestStatus = computed(() => this.saveRequestState().status);
  
  readonly errors: Signal<Record<string, string>> = computed<Record<string, string>>(() => {
    const _ = this.translate.userLang();
    const record = setup_errors['exceptions']
    const translated: Record<string, string> = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [key, this.translate.translate(value)])
    );
    return translated;
  });

  readonly notifyTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ALERTS.WARNING')
  })
  readonly notifyBody = computed<string[]>(() => {
    const owner = this.singleProvider.selected();
    if (!owner || !isOwner(owner)) return [];

    const tz = this.timeZone();
    if (!tz) return [];

    const exceptions = this.exceptions();
    const now = getZonedNow(tz);
    const reservations = this.singleProvider.activeOwnerReservations()
      .filter(i =>
        i.timeslot.date > now.date ||
        (i.timeslot.date === now.date && toMinutes(i.timeslot.start) >= toMinutes(now.time))
      )
      .sort((a, b) => {
        const dateA = a.timeslot.date;
        const dateB = b.timeslot.date;
        if (dateA !== dateB) { return dateA > dateB ? 1 : -1; }
        return toMinutes(a.timeslot.start) - toMinutes(b.timeslot.start);
      });

    const warningList: string[] = [];

    for (const reservation of reservations) {
      const { date, start } = reservation.timeslot;

      const [, monthStr, dayStr] = date.split('-');
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      const governingException = exceptions.find((exception) => {
        switch (exception.type) {
          case 'oneOff':
            return exception.appliesTo?.date! === date;
          case 'range':
            return date >= exception.appliesTo?.startDate!
              && date <= exception.appliesTo?.endDate!;
          case 'annual':
            return exception.appliesTo?.month! === month
              && exception.appliesTo?.day! === day;
          default:
            return false;
        }
      });

      if (!governingException) continue;

      if (governingException.isClosed) {
        warningList.push(`${reservation.articleName} - ${this.formatDate(date)} ${start} `);
        continue;
      }

      const isAffected = governingException.intervals?.some((interval) => {
        if (!interval.start || !interval.end) return false;
        return start >= interval.start && start < interval.end;
      });

      if (isAffected) {
        warningList.push(`${reservation.articleName} - ${this.formatDate(date)} ${start} `);
      }
    }

    return warningList;
  });

  readonly hasNotification = computed(() => {
    return !!this.notifyBody().length;
  })

  readonly errorTitle = computed<string>(() => {
    const _ = this.translate.userLang();
    return this.translate.translate('ERRORS.SETUP.EXCEPTIONS.TITLE')
  });

  readonly errorBody = computed<string[]>(() => {
    const errorMessages = this.errors();      // Record<string, string>
    const validationErrors = this.vm().form.errors;
    const exceptions = this.exceptions();

    if (!validationErrors) { return [];}
    const errorList: string[] = [];

    Object.entries(validationErrors).forEach(([key, value]) => {
      if (key === 'exceptions' && Array.isArray(value)) {
        value.forEach((exceptionErrors, index) => {
          if (!exceptionErrors) return;

          Object.entries(exceptionErrors).forEach(([errorKey, errorValue]) => {
            if(errorKey === 'intervals' && Array.isArray(errorValue)){
              errorValue.forEach((intervalErrors, iindex) => {
                if (!intervalErrors) return;

                Object.keys(intervalErrors).forEach(iErrorKey => {
                  const message =  errorMessages[iErrorKey];
                  if (message) {
                    errorList.push(`${!!exceptions[index].label ? exceptions[index].label : ( this.getExceptionText() + ' ' + (index + 1)) }, ${this.getIntervalText()} ${iindex + 1}: ${message}`);
                  }
                });
              })
              return;
            }

            const message =  errorMessages[errorKey];
            if (message) {
              errorList.push(`${!!exceptions[index].label ? exceptions[index].label : ( this.getExceptionText() + ' ' + (index + 1)) }: ${message}`);
            }
          });
        });
        return;
      }

      const message = errorMessages[key];
      if (message) {
        errorList.push(message);
      }
    });

    return errorList;
  });

  readonly hasErrorIndex = computed<{ self: boolean, intervals: boolean[] }[]>(() => {
    const form = this.vm().form;
    const exceptions = this.vm().value.exceptions;

    if(!exceptions) return [];

    const hasErrorsList = exceptions.map((it) => ({ self: false, intervals: it.intervals?.map(i => false) ?? [] } ));

    const dayErrors = form.errors?.['exceptions'];

    if (!Array.isArray(dayErrors)) {
      return hasErrorsList;
    }

    dayErrors.forEach((error, index) => {
      if (error) {
        hasErrorsList[index].self = true;

        const intervalErrors = error['intervals'];
        if(intervalErrors && Array.isArray(intervalErrors)){
          intervalErrors.forEach((e, i) => {
            if(e){
              hasErrorsList[index].intervals[i] = true;
            }
          })
        }
      }
    });

    return hasErrorsList;
  });
  
  readonly viewInvalid = computed(()=> this.vm().state === 'invalid');
  
  readonly exceptionTypes = ["oneOff", "range", "annual"];

  readonly exceptionTypeNames = computed(()=>{
    const _ = this.translate.userLang();
    return [
      this.translate.translate('SETUP.EXCEPTIONS.ONEOFF'), 
      this.translate.translate('SETUP.EXCEPTIONS.RANGE'), 
      this.translate.translate('SETUP.EXCEPTIONS.ANNUAL')
    ]
  })

  readonly exceptions = computed(()=>{
    const vm = this.vm().value;
    return vm.exceptions ?? [];
  })

  readonly monthNames = computed(()=>{
    const months = this.translate.monthNames();
    return months;
  })

  readonly shortMonthNames = this.translate.shortMonthNames;
  private formatDate(yyyymmdd: string): string {
    // e.g. "2025-07-14" → "14 July 2025"
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const monthName = this.shortMonthNames()[month - 1] ?? '';
    return `${day} ${monthName} ${year}`;
  }

  readonly monthDays = generateMonthDays()
  readonly monthDaysString: string[][] = this.monthDays.map(m => m.map(d => d.toString()));

  readonly timeZone = computed<string | null>(()=>{    
    const owner = this.singleProvider.selected();
    if(!owner || !isOwner(owner)) return null;
    const studio = this.singleProvider.activeStudio();
    if(!studio) return null;

    return studio.timeZone;
  })


  readonly getTitle = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.TITLE');
  })
  
  readonly getPar1 = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.PAR1');
  })

  readonly getSaveButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.SAVE');
  })

  readonly getAddButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.ADD');
  })

  readonly getAddIntervalButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.ADD_INTERVAL');
  })

  readonly getNextButtonText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.NEXT');
  })

  readonly getstartText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.START_TIME');
  })

  readonly getendText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.END_TIME');
  })

  readonly getIntervalText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.INTERVAL');
  })

  readonly getDefineIntervalText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.SCHEDULE.DEFINE_INTERVAL');
  })

  readonly getStudioClosedText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.STUDIO_CLOSED');
  })
  
  readonly getStudioClosedHelperText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.STUDIO_IS_CLOSED');
  })

  readonly getStudioClosedIntervalHelperText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.STUDIO_IS_INTERVAL_CLOSED');
  })
  readonly getExceptionText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.EXCEPTION');
  })
  readonly getExceptionTitleText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.LABEL');
  })
  readonly getExceptionTypeText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('SETUP.EXCEPTIONS.TYPE');
  })
  readonly getMonthText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DATE.MONTH');
  })
  readonly getDayText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DATE.DAY');
  })
  readonly getDateText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DATE.DATE');
  })
  readonly getStartDateText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DATE.START_DATE');
  })
  readonly getEndDateText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('DATE.END_DATE');
  })
  
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

  expandException(localId: string): void {
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

  collapseException(localId: string): void {
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

  toggleException(localId: string): void {
    this.isExpanded(localId)
      ? this.collapseException(localId)
      : this.expandException(localId);
  }

  

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  getExceptionType(value: string | undefined): string {
    if(!value) return ''
    if(!this.exceptionTypes.includes(value)) return '';
    const index = this.exceptionTypes.indexOf(value);
    return this.exceptionTypeNames()[index];
  }

  addException(){
    const timeZone = this.timeZone();
    if(!timeZone) return;
    this.setup.addException(timeZone);
  }

  removeException(exceptionIndex: number){
    this.setup.removeException(exceptionIndex);
  }

  setExceptionLabel(exceptionIndex: number, value: string){

    const current = this.exceptions()[exceptionIndex];
    if(!current || current.label === value ) return;
    this.setup.setExceptionLabel(exceptionIndex, value);
  }

  setExceptionType(exceptionIndex: number, value: string){
    const exceptionNames = this.exceptionTypeNames();
    if(!exceptionNames.includes(value)) return;
    const index = exceptionNames.indexOf(value);

    const current = exceptionNames.indexOf(this.exceptions()[exceptionIndex].type!);
    if(current === index ) return;

    const timeZone = this.timeZone();
    if(!timeZone) return;
    this.setup.setExceptionType(exceptionIndex, this.exceptionTypes[index] as "oneOff" | "range" | "annual", timeZone);
  }
  
  setExceptionAppliesToDate(exceptionIndex: number, date: string){
    
    const current = this.exceptions()[exceptionIndex].appliesTo as { date: string; }

    if(!current || date === current.date) return;

    this.setup.setExceptionAppliesToDate(exceptionIndex, date);
  }
  
  setExceptionAppliesToDay(exceptionIndex: number, day: string){
    if( ! (!!day) ) return;

    const dayIndex = parseInt(day);

    const current = this.exceptions()[exceptionIndex].appliesTo as { month: number; day: number; }

    if(current.day === dayIndex) return;

    this.setup.setExceptionAppliesToDay(exceptionIndex, dayIndex);
  
  }

  setExceptionAppliesToMonth(exceptionIndex: number, month: string){
    const monthIndex = 1 + this.monthNames().indexOf(month);
    
    const current = this.exceptions()[exceptionIndex].appliesTo as { month: number; day: number; }
    
    if(current && current.month === monthIndex) return;

    this.setup.setExceptionAppliesToMonth(exceptionIndex, monthIndex);
  }

  setExceptionAppliesToStartDate(exceptionIndex: number, startDate: string){
    
    const current = this.exceptions()[exceptionIndex].appliesTo as { startDate: string; endDate: string; }

    if(!current || startDate === current.startDate) return;

    this.setup.setExceptionAppliesToStartDate(exceptionIndex, startDate);
  }

  setExceptionAppliesToEndDate(exceptionIndex: number, endDate: string){

    const current = this.exceptions()[exceptionIndex].appliesTo as { startDate: string; endDate: string; }

    if(!current || endDate === current.endDate) return;

    this.setup.setExceptionAppliesToEndDate(exceptionIndex, endDate);
  }

  setExceptionIsClosed(exceptionIndex: number, value: boolean){
    
    const current = this.exceptions()[exceptionIndex].isClosed
    
    if(current === value) return;

    this.setup.setExceptionIsClosed(exceptionIndex, value);
  }
  
  addExceptionInterval(exceptionIndex: number){
    this.setup.addExceptionInterval(exceptionIndex);
  }
  
  removeExceptionInterval(exceptionIndex: number, intervalIndex: number){
    this.setup.removeExceptionInterval(exceptionIndex, intervalIndex);
  }
  
  setExceptionIntervalStart(exceptionIndex: number, intervalIndex: number, value: string){
    
    const current = this.exceptions()[exceptionIndex].intervals?.at(intervalIndex)?.start
    if(current === value) return;
    
    this.setup.setExceptionIntervalStart(exceptionIndex, intervalIndex, value);
  }
  
  setExceptionIntervalEnd(exceptionIndex: number, intervalIndex: number, value: string){
    const current = this.exceptions()[exceptionIndex].intervals?.at(intervalIndex)?.end
    if(current === value) return;

    this.setup.setExceptionIntervalEnd(exceptionIndex, intervalIndex, value);
  }

  save(){
    if(!this.viewInvalid()) {
      this.setup.saveExceptions()
      .subscribe({
        next: (value)=>{
          this.saveRequestState.set(value);
          if(value.status === 'success'){
            const active = this.singleProvider.activeStudio()!;
            const update_studio : Studio = { ...active, exceptions: value.data };
            this.singleProvider.update(update_studio);
            
            this.setup.markAsSaved('exception');
          } 
        },
        error: (err)=>{ console.error(err); }
      });
    }
  }
}
