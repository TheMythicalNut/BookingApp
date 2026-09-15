import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { LoadOwnerOptions, Owner } from '../../models/models';
import { catchError, finalize, Observable, shareReplay, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OwnerProvider {
  
  // // TEST DATA
  // exampleOwner0: Owner = {
  //     id: '0',
  //     firstName: 'Oliver',
  //     lastName: "Queen",
  //     studio: '0',
  //     creditCardNumber: '',
  //     cvc: '',
  //     expirationDate: '',
  //     email: 'oliver.queen@dccomics.com',
  //     newPassword: '',
  //     password: '',
  //     setupState: 'INTRO',
  //     status: 'ACTIVE'
  // }
  // exampleOwner1: Owner = {
  //     id: '1',
  //     firstName: 'Oliver',
  //     lastName: "King",
  //     studio: '1',
  //     creditCardNumber: '',
  //     cvc: '',
  //     expirationDate: '',
  //     email: 'oliver.king@dmccomics.com',
  //     newPassword: '',
  //     password: '',
  //     setupState: 'COMPLETED',
  //     status: 'ACTIVE'
  // }
  // // TEST DATA

  private readonly http = inject(HttpClient);

  constructor(){
    //this.cacheOwner(this.exampleOwner0);
    //this.cacheOwner(this.exampleOwner1);
  }

  private readonly _owners = signal<Owner[]>([]);
  readonly owners: Signal<Owner[]> = this._owners.asReadonly();

  readonly ownersById = new Map<string, Owner>();
  private readonly inFlightRequests = new Map<string, Observable<Owner>>();
  private readonly ownerSignals = new Map<string, Signal<Owner | undefined>>();
  getOwnerSignal(identifier: string): Signal<Owner | undefined> {
    const key = `id:${identifier}`;
    
    const existing = this.ownerSignals.get(key);
    if (existing) return existing;

    const signal = computed(() => {
      this.owners();
      const id = identifier;
      if (!id) return undefined;
      return this.ownersById.get(id) ?? undefined;
    });

    this.ownerSignals.set(key, signal);
    return signal;
  }

  ensureOwnerLoaded(identifier: string): void {
    const cached = this.getFromCache(identifier);
    if (cached) return;

    const cacheKey = `${'id'}:${identifier}`;
    if (this.inFlightRequests.has(cacheKey)) return;

    const request$: Observable<Owner> = (
      this.loadOwnerById(identifier)
    ).pipe(
      tap(owner => this.cacheOwner(owner)),
      finalize(() => this.inFlightRequests.delete(cacheKey)),
      shareReplay(1)
    );

    this.inFlightRequests.set(cacheKey, request$);

    request$.subscribe();
  }

  loadOwners(options: LoadOwnerOptions): void {
    this.http.post<Owner[]>(`/api/owners`, { options }).pipe(
      tap(owners => this.cacheOwners(owners)),
      catchError(err => this.handleError('loadOwners', err))
    ).subscribe();
  }

  loadOwnersById(ids: string[]): void {
    const missingIds = ids.filter(id => !this.ownersById.has(id));
    if (!missingIds.length) return;

    this.http.post<Owner[]>(
      `/api/owners/ids`,
      { ids: missingIds }
    ).pipe(
      tap(owners => this.cacheOwners(owners)),
      catchError(err => this.handleError('loadOwnersById', err))
    ).subscribe();
  }

  update(owner: Owner){
    this.cacheOwner(owner);
  }

  private loadOwnerById(id: string): Observable<Owner> {
    return this.http.get<Owner>(`/api/owners/id/${id}`).pipe(
      catchError(err => this.handleError('loadOwnerById', err))
    );
  }

  private getFromCache(identifier: string): Owner | undefined {
    return this.ownersById.get(identifier);
  }

  private cacheOwners(owners: Owner[]): void {
    owners.forEach(owner => this.cacheOwner(owner, false));
    this.emitOwners();
  }

  private cacheOwner(owner: Owner, emit = true): void {
    this.ownersById.set(owner.id, owner);

    if (emit) {
      this.emitOwners();
    }
  }

  private emitOwners(): void {
    this._owners.set(Array.from(this.ownersById.values()));
  }

  private handleError(source: string, error: unknown): Observable<never> {
    console.error(`[OwnerProvider] ${source} failed`, error);
    return throwError(() => error);
  }
}
