import { Component, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../../../../../services/translation/translation';
import { getZonedNow, minutesToTime, toMinutes, zonedDate } from '../../../../../../util/studio_hours';
import { UnifiedSingleProvider } from '../../../../../../services/unified/unified-single-provider';
import { RequestState, Reservation, reservation_status } from '../../../../../../models/models';
import { Button } from "../../../../../../components/common/button/button";
import { UnifiedSetter } from '../../../../../../services/unified/unified-setter';
import { RequestStatusMessage } from "../../../../../../components/common/request-status-message/request-status-message";
import { Router } from '@angular/router';
import { DAY_KEYS } from '../../../../../../CONST';

@Component({
  selector: 'dashboard-main',
  imports: [Button, RequestStatusMessage],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {
  private readonly translate = inject(TranslationService);
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);
  private readonly router = inject(Router);

  private readonly owner = this.singleProvider.selected;
  private readonly studio = this.singleProvider.activeStudio;
  private readonly reservations = this.singleProvider.activeOwnerReservations;
  readonly monthNames = this.translate.shortMonthNames;

  /* ---------------------------------------------------
     CORE DATA
  --------------------------------------------------- */

  readonly confirmRequest = signal<{id: string, status: reservation_status} | undefined>(undefined);
  readonly confirmRequestState = signal<RequestState<Reservation>>({ status: 'idle' });
  readonly requestStatus = computed(() => this.confirmRequestState().status);
  readonly activatedReservationId = signal<string | undefined>(undefined);

  readonly actionsNeeded = computed<boolean>(() => {
    const actionsNeeded = this.reservationsWithActionsNeeded();
    return !!actionsNeeded.length;
  });

  readonly reservationsWithActionsNeeded = computed<Reservation[]>(() => {
    const reservations = this.reservations();
    const studio = this.studio();

    if(!reservations.length || !studio) return [];

    const zoned = getZonedNow(studio.timeZone);

    const actionsNeeded = reservations.filter(i => i.status.status === 'CONFIRMED' && 
      ( i.timeslot.date < zoned.date || (  i.timeslot.date === zoned.date
          && ( toMinutes(i.timeslot.start) + i.duration ) <= toMinutes(zoned.time) ) )
    );

    return actionsNeeded; // to be marked as COMPLETED or MISSED
  });

  readonly upcomingReservations = computed<Reservation[]>(() => {
    const reservations = this.reservations();
    const studio = this.studio();

    if(!reservations.length || !studio) return [];

    const zoned = getZonedNow(studio.timeZone);

    const upcoming = reservations
      .filter(i => i.status.status === 'CONFIRMED' && i.timeslot.date === zoned.date && toMinutes(i.timeslot.start) > toMinutes(zoned.time) )
      .sort((a, b) => {
        const dateA = a.timeslot.date;
        const dateB = b.timeslot.date;

        return dateA !== dateB
          ? ( dateA > dateB ? 1 : -1 )
          : ( toMinutes(a.timeslot.start) - toMinutes(b.timeslot.start))
      });
      

    return upcoming;
  })

  /* ---------------------------------------------------
     TRANSLATION DICTIONARY
  --------------------------------------------------- */

  private readonly lang = this.translate.userLang;
  private tr = (key: string) => this.translate.translate(key);

  
  readonly title = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.MAIN.TITLE');
  })

  readonly actionsNeededTitle = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.MAIN.ACTIONS_NEEDED_TABLE_TITLE');
  })

  readonly todaysScheduleTitle = computed(()=>{
    this.lang();
    return this.tr('DASHBOARD.MAIN.TODAYS_SCHEDULE_TABLE_TITLE');
  })

  readonly getCompletedButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.MARK_COMPLETED');
  })

  readonly getMissedButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.MARK_MISSED');
  })
  
  readonly getConfirmButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.CONFIRM');
  })
  
  readonly getCancelButtonTitle = computed(()=>{
    this.lang();
    return this.tr('BUTTON.CANCEL');
  })

  readonly currentDate = computed(()=>{
    this.lang();
    const studio = this.studio();

    if(!studio) return '';

    const zoned = getZonedNow(studio.timeZone);
    const date = zoned.date;
    const dayOfWeek = zoned.dayOfWeek.toUpperCase();

    const [yyyy, mm, dd] = date.split('-');
    const mn = this.translate.shortMonthNames()[parseInt(mm) - 1];
    const dn = this.tr('DATE.' + dayOfWeek);
    return dn + ', ' + mn + ' ' + dd + '. ' + yyyy;
  })
  

  /* ---------------------------------------------------
     ACTIONS
  --------------------------------------------------- */

  formatDisplay(value: string): string {
    const parts = value.split('-');
    if (parts.length !== 3) return '';
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return '';
    return d + '. ' + this.monthNames()[m - 1] + ' ' + y;
  }

  computeEndTime(startTime: string, duration: number): string {
    return minutesToTime(toMinutes(startTime) + duration) 
  }

  updateResStatus(id: string, status: reservation_status) {
    return this.confirmRequest.set({id, status});
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

  activateReservation(id: string) {
    const cur_id = this.activatedReservationId();
    this.activatedReservationId.set(cur_id === id ? undefined: id);
  }

  navReservation(resID: string){
    this.router.navigate([`reservation/${resID}`]);
  }

  navStudioPage(){
    const link = this.studio()?.link
    if(!link) return;
    this.router.navigate([link]);
  }
}
