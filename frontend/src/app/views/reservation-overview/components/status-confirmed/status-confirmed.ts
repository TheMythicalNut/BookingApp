import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { TranslationService } from '../../../../services/translation/translation';
import { UnifiedSingleProvider } from '../../../../services/unified/unified-single-provider';
import { isReservation, Reservation, timeslot } from '../../../../models/models';
import { HALF_DAY } from '../../../../util/time_constants';
import { FilterTimeslot } from "../../../on-reserve/components/filter-timeslot/filter-timeslot";
import { DatePicker } from "../../../../components/modals/date-picker/date-picker";
import { Recommendations } from "../../../on-reserve/components/recommendations/recommendations";
import { TimeslotSelect } from "../../../on-reserve/components/timeslot-select/timeslot-select";
import { DateSelect } from "../../../on-reserve/components/date-select/date-select";
import { dateToYYYYMMDD, toYYYY_MM_DD } from '../../../../util/studio_days';
import { ScrollIntoView } from "../../../../directives/scroll-into-view";
import { UserProvider } from '../../../../services/user/user';

@Component({
  selector: 'reservation-status-confirmed',
  imports: [FilterTimeslot, DatePicker, Recommendations, TimeslotSelect, DateSelect, ScrollIntoView],
  templateUrl: './status-confirmed.html',
  styleUrl: './status-confirmed.css',
})
export class StatusConfirmed {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly user = inject(UserProvider);

  readonly cancel = output<boolean>(); // false - not too close, true - too close
  readonly change = output<timeslot>();

  readonly reservation = input<Reservation | undefined>(undefined);
  readonly hasPriv = input<boolean>(false);

  readonly article = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return undefined;
    
    if(res.service) return this.singleProvider.activeServices().find(i => i.id === res.service);
    if(res.package) return this.singleProvider.activePackages().find(i => i.id === res.package);
    return undefined;
  })

  readonly pageState = signal<'overview' | 'reschedule'>('overview');

  readonly showDatePicker = signal(false);
  readonly date = signal<Date | undefined>(undefined);
  readonly time = signal<string | undefined>(undefined);

  readonly requireConfirmCancel = signal(false);
  readonly maxChanges = 2;

  constructor(){
    effect(()=>{
      const filters = this.user.filters();
      if(filters.timeslot && filters.timeslot.startDate === filters.timeslot.endDate){
        this.date.set(filters.timeslot.startDate);
      }
    })
  }

  readonly isChangeDisabled = computed(()=>{
    const date = this.date();
    const time = this.time();
    return !(!!date && !!time);
  });

  readonly tooClose = computed(()=>{
    const res = this.reservation();

    if(this.hasPriv()) return false;
    
    if(!res || !isReservation(res)) return true;
  
    return this.calcTooClose(res.timeslot, res.timeZone)
  })

  readonly getTermChanges = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return 0;
    return res.termChangeCount;
  })
  
  readonly isPrimaryDisabled = computed(()=>{
    const res = this.reservation();
    if(this.hasPriv()) return false;
    if(!res || !isReservation(res)) return true;

    return (res.termChangeCount >= this.maxChanges) 
      || this.calcTooClose(res.timeslot, res.timeZone)
      && !this.requireConfirmCancel();
  })

  readonly getMessageTooClose = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.TOO_CLOSE_TO_RESCHEDULE');
  })

  readonly getMessageCancelPenalty = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('MESSAGES.CANCEL_PENALTY');
  })
  readonly getButtonConfirmText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.CONFIRM');
  })

  readonly getButtonRescheduleText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.RESCHEDULE');
  })
  readonly getButtonBackText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.BACK');
  })

  readonly getButtonCancelText = computed(()=>{
    const _ = this.translate.userLang();
    return this.translate.translate('BUTTON.CANCEL');
  })

  selectDate(date: Date){
    this.date.set(date);
  }
  selectTime(time: string | null){
    this.time.set(time?? undefined);
  }

  onChange(){
    const dt = this.date();
    const time = this.time();
    const res = this.reservation();
            
    if(!time || !dt || !res || !isReservation(res)) return;
    
    const date = dateToYYYYMMDD(dt);

    const timeslot: timeslot = {
      date: date,
      start: time
    }

    this.change.emit(timeslot);
    this.pageState.set('overview');
  }

  onSecondary(){
    const state = this.pageState();
    if(state === 'overview')
      this.requireConfirmCancel.update(v => !v);
    else if(state === 'reschedule'){
      this.pageState.set('overview');
    }
  }

  onPrimary(){
    const cancel = this.requireConfirmCancel();
    if(!cancel){
      this.pageState.set('reschedule');
    }
    else{
      this.cancel.emit(this.tooClose());
    }
  }

  calcTooClose( timeslot: timeslot, timeZone: string, maxOffset: number = HALF_DAY // 12 hours
  ): boolean {

    if (!/^\d{4}-\d{2}-\d{2}$/.test(timeslot.date)) {
      console.error('ERROR: invalid date format, expected YYYY-MM-DD');
      return false;
    }

    const [y, m, d] = timeslot.date.split('-').map(Number);
    const [hh, mm] = timeslot.start.split(':').map(Number);

    const utcDate = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0));

    if (isNaN(utcDate.getTime())) {
      console.error('ERROR: invalid calendar date');
      return false;
    }

    const now = new Date();

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const map: any = {};
    for (const p of parts) {
      if (p.type !== 'literal') {
        map[p.type] = Number(p.value);
      }
    }

    const todayStart = new Date(
      map.year,
      map.month - 1,
      map.day,
      map.hour,
      map.minute,
      map.second,
      0
    );

    const todayEnd = new Date(todayStart.getTime() + maxOffset);

    return utcDate >= todayStart && utcDate < todayEnd;
  }  

}
