import { Component, computed, effect, inject, signal } from '@angular/core';
import { UnifiedSingleProvider } from '../../services/unified/unified-single-provider';
import { isOwner, isReservation, Package, RequestState, Reservation, ReservationRating, Service, timeslot } from '../../models/models';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Info } from "./components/info/info";
import { StatusMissed } from "./components/status-missed/status-missed";
import { StatusCompleted } from "./components/status-completed/status-completed";
import { StatusConfirmed } from "./components/status-confirmed/status-confirmed";
import { Spinner } from "../../components/common/spinner/spinner";
import { UnifiedSetter } from '../../services/unified/unified-setter';
import { RequestStatusMessage } from "../../components/common/request-status-message/request-status-message";

@Component({
  selector: 'app-reservation-overview',
  imports: [Info, StatusMissed, StatusCompleted, StatusConfirmed, Spinner, RequestStatusMessage],
  templateUrl: './reservation-overview.html',
  styleUrl: './reservation-overview.css',
})
export class ReservationOverview {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.singleProvider.loading;
  readonly selected = this.singleProvider.selected;
  readonly reservation = signal<Reservation | undefined>(undefined);

  readonly studio = computed(() => this.singleProvider.activeStudio())

  readonly package = computed<Package | undefined>(() => {
    const res = this.reservation();
    if(!res) return undefined;
    const packageId = res.package;
    if(packageId) return this.singleProvider.activePackages().find(i => i.id === packageId);
    return undefined
  });

  readonly service = computed<Service | undefined>(() => {
    const res = this.reservation();
    if(!res) return undefined;
    const serviceId = res.service;
    if(serviceId) return this.singleProvider.activeServices().find(i => i.id === serviceId); 
    return undefined
  });

  private params = toSignal(this.route.paramMap);
  readonly reservationID = computed(() => this.params()?.get('id'));

  readonly requestState = signal<RequestState<Reservation>>({status: 'idle'});
  readonly requestStatus = computed(() => this.requestState().status);

  constructor(){
    effect(()=>{
      const resID = this.reservationID();
      const selected = this.selected();

      if(!resID) return;

      
      if(selected && isOwner(selected)) {
        this.reservation.set(this.singleProvider.activeOwnerReservations().find(it => it.id === resID));
        return;
      }

      if(selected && isReservation(selected) && selected.id === resID){
        if(selected.status.status === 'PENDING_CONFIRMATION'){
          this.confirmReservation(resID);
        }
        this.reservation.set(selected);
        return;
      }
      
      this.singleProvider.select('reservation', resID);
    });
  }


  readonly getReservationStatus = computed(()=>{
    const res = this.reservation();
    if(!res || !isReservation(res)) return '';
    return res.status.status;
  })

  readonly hasPrivilege = computed<boolean>(() => {
    const selected = this.selected();
    const resID = this.reservationID();
    return !!selected && !!isOwner(selected) && !!this.singleProvider.activeOwnerReservations().find(i => i.id === resID);
  })

  private confirmReservation(resID: string){
    const request$ = this.setter.update('reservation', {id: resID, status: {status: 'CONFIRMED' }});
    request$.subscribe({
      next: (value)=>{
        this.requestState.set(value);
        if(value.status === 'success'){
          this.singleProvider.update(value.data);
          this.singleProvider.select('reservation', value.data.id);
        } 
       },
      error: (err)=>{ console.error(err); }
    });
  }
  
  cancelReservation(tooClose: boolean){
    const hasPriv = this.hasPrivilege();
    const reservation = this.reservation();
    if(!reservation) return;
    const id = reservation.id;
    
    const request$ = 
    hasPriv
    ? tooClose
      ? this.setter.update('reservation', { id: id, status: { status: 'OWNER_LATE_CANCELLED' } })
      : this.setter.update('reservation', { id: id, status: { status: 'OWNER_CANCELLED' } })
    : tooClose
      ? this.setter.update('reservation', { id: id, status: { status: 'USER_LATE_CANCELLED' } })
      : this.setter.update('reservation', { id: id, status: { status: 'USER_CANCELLED' } })


    request$.subscribe({
      next: (value)=>{
        this.requestState.set(value);
        if(value.status === 'success'){
          this.singleProvider.update(value.data);
          if(!hasPriv) this.singleProvider.select('reservation', value.data.id);
        }
       },
      error: (err)=>{ console.error(err); }
    })
  }

  changeReservation(timeslot: timeslot){
    const hasPriv = this.hasPrivilege();
    const reservation = this.reservation();
    if(!reservation) return;
    const id = reservation.id;

    const request$ = this.setter.update('reservation', { id: id, timeslot: timeslot });
    request$.subscribe({
      next: (value)=>{
        this.requestState.set(value);
        if(value.status === 'success'){
          this.singleProvider.update(value.data);
          if(!hasPriv) this.singleProvider.select('reservation', value.data.id);
        }
       },
      error: (err)=>{ console.error(err); }
    })
  }

  reviewReservation(review: ReservationRating){
    const hasPriv = this.hasPrivilege();
    if(hasPriv) return;
    const reservation = this.reservation();
    if(!reservation) return;
    const id = reservation.id;

    const request$ = this.setter.update('reservation', { id: id, rating: review });
    request$.subscribe({
      next: (value)=>{
        this.requestState.set(value);
        if(value.status === 'success'){
          this.singleProvider.update(value.data);
          this.singleProvider.select('reservation', value.data.id);
        }
       },
      error: (err)=>{ console.error(err); }
    })
  }
}
