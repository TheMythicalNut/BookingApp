import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, startWith, throwError } from 'rxjs';
import { RequestState, Reservation } from '../../models/models';
import { SetterContract } from '../unified/unified-setter';

@Injectable({
  providedIn: 'root',
})
export class ReservationSetter implements SetterContract<Reservation> {
  private readonly http = inject(HttpClient);

  resend(reservationID: string): Observable<RequestState<void>> {
    const key = reservationID;
    
    const url = `/api/reservations/resend/${reservationID}`

    const request$ = this.http.get<void>(url).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<void> => ({ status: 'success', data })),
      startWith<RequestState<void>>({ status: 'loading' }),
      catchError((error) => of<RequestState<void>>({ status: 'error', error }))
    );
  }

  private readonly inFlightRequests = new Map<string, Observable<Reservation> | Observable<void>>();

  create(reservation: Omit<Reservation, 'id'>): Observable<RequestState<Reservation>> {
    const key = this.createKey(reservation);
    const request$ = this.getOrCreateRequest$(key, reservation, 'create');
    return request$.pipe(
      map((data): RequestState<Reservation> => ({ status: 'success', data })),
      startWith<RequestState<Reservation>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Reservation>>({ status: 'error', error }))
    );
  }

  update(reservation: Partial<Reservation> & { id: string }): Observable<RequestState<Reservation>> {
    const key = reservation.id;
    const request$ = this.getOrCreateRequest$(key, reservation, 'update');
    return request$.pipe(
      map((data): RequestState<Reservation> => ({ status: 'success', data })),
      startWith<RequestState<Reservation>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Reservation>>({ status: 'error', error }))
    );
  }

  private getOrCreateRequest$(
    key: string,
    reservation: Partial<Reservation>,
    type: 'create' | 'update'
  ): Observable<Reservation> {
    const existing = this.inFlightRequests.get(key) as Observable<Reservation>;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(reservation, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    reservation: Partial<Reservation>,
    type: 'create' | 'update'
  ): Observable<Reservation> {
    const url =
      type === 'create'
        ? '/api/set/reservations/create'
        : `/api/set/reservations/update/${reservation.id}`;

    return this.http.post<Reservation>(url, { reservation }).pipe(
      catchError((error) => {
        console.error(`[ReservationSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(reservation: Omit<Reservation, 'id'>): string {
    const { studio, service, package: pkg } = reservation;
    return `create:${studio}:${service}:${pkg}`;
  }

  // Intentionally not implemented methods
  delete(payload: { id: string; } & Partial<Reservation>): Observable<RequestState<Reservation>> {
    throw new Error('Method Not Supported.');
  }
}
