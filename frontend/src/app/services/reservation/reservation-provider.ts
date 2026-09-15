import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { LoadReservationOptions, Reservation } from '../../models/models';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, Observable, shareReplay, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ReservationProvider {

  private readonly http = inject(HttpClient);
  private readonly _reservations = signal<Reservation[]>([]);
  readonly reservations: Signal<Reservation[]> = this._reservations.asReadonly();

  readonly reservationsById = new Map<string, Reservation>();
  private readonly inFlightRequests = new Map<string, Observable<Reservation>>();
  private readonly reservationSignals = new Map<string, Signal<Reservation | undefined>>();

  getReservationSignal(identifier: string): Signal<Reservation | undefined> {
    const key = `id:${identifier}`;
    
    const existing = this.reservationSignals.get(key);
    if (existing) return existing;

    const signal = computed(() => {
      this.reservations();
      const id = identifier;
      if (!id) return undefined;
      return this.reservationsById.get(id) ?? undefined;
    });

    this.reservationSignals.set(key, signal);
    return signal;
  }

  ensureReservationLoaded(identifier: string): void {
    const cached = this.getFromCache(identifier);
    if (cached) return;

    const cacheKey = `${'id'}:${identifier}`;
    if (this.inFlightRequests.has(cacheKey)) return;

    const request$: Observable<Reservation> = (
      this.loadReservationById(identifier)
    ).pipe(
      tap(reservation => this.cacheReservation(reservation)),
      finalize(() => this.inFlightRequests.delete(cacheKey)),
      shareReplay(1)
    );

    this.inFlightRequests.set(cacheKey, request$);

    request$.subscribe();
  }

  loadStudioReservations(): void {
    this.http.get<Reservation[]>('/api/reservations/studio').pipe(
      tap(reservations => { 
        this.reservationsById.clear();
        this.cacheReservations(reservations);
      }),
      catchError(err => this.handleError('loadStudioReservations', err))
    ).subscribe();
  }

  loadReservations(options: LoadReservationOptions): void {
    this.http.post<Reservation[]>(`/api/reservations`, { options }).pipe(
      tap(reservations => this.cacheReservations(reservations)),
      catchError(err => this.handleError('loadReservations', err))
    ).subscribe();
  }

  loadReservationsById(ids: string[]): void {
    const missingIds = ids.filter(id => !this.reservationsById.has(id));
    if (!missingIds.length) return;

    this.http.post<Reservation[]>(
      `/api/reservations/ids/`,
      { ids: missingIds }
    ).pipe(
      tap(reservations => this.cacheReservations(reservations)),
      catchError(err => this.handleError('loadReservationsById', err))
    ).subscribe();
  }
  
  update(reservation: Reservation){
    this.cacheReservation(reservation);
  }

  private loadReservationById(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`/api/reservations/id/${id}`).pipe(
      catchError(err => this.handleError('loadReservationById', err))
    );
  }

  private getFromCache(identifier: string): Reservation | undefined {
    return this.reservationsById.get(identifier);
  }

  private cacheReservations(reservations: Reservation[]): void {
    reservations.forEach(reservation => this.cacheReservation(reservation, false));
    this.emitReservations();
  }

  private cacheReservation(reservation: Reservation, emit = true): void {
    this.reservationsById.set(reservation.id, reservation);

    if (emit) {
      this.emitReservations();
    }
  }

  private emitReservations(): void {
    this._reservations.set(Array.from(this.reservationsById.values()));
  }

  private handleError(source: string, error: unknown): Observable<never> {
    console.error(`[ReservationProvider] ${source} failed`, error);
    return throwError(() => error);
  }
}
