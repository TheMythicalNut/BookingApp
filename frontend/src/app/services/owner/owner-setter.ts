import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, map, of, shareReplay, startWith, throwError } from 'rxjs';
import { RequestState, Owner } from '../../models/models';
import { SetterContract } from '../unified/unified-setter';

@Injectable({
  providedIn: 'root',
})
export class OwnerSetter implements SetterContract<Owner> {
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<Owner>>();

  create(owner: Omit<Owner, 'id'>): Observable<RequestState<Owner>> {
    const key = this.createKey(owner);
    const request$ = this.getOrCreateRequest$(key, owner, 'create');
    return request$.pipe(
      map((data): RequestState<Owner> => ({ status: 'success', data })),
      startWith<RequestState<Owner>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Owner>>({ status: 'error', error }))
    );
  }

  update(owner: Partial<Owner> & { id: string }): Observable<RequestState<Owner>> {
    const key = `update:${owner.id}`;
    const request$ = this.getOrCreateRequest$(key, owner, 'update');
    return request$.pipe(
      map((data): RequestState<Owner> => ({ status: 'success', data })),
      startWith<RequestState<Owner>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Owner>>({ status: 'error', error }))
    );
  }

  delete(owner: Partial<Owner> & { id: string}): Observable<RequestState<Owner>> {
    const key = `delete:${owner.id}`
    const request$ = this.getOrCreateRequest$(key, owner, 'delete');
    return request$.pipe(
      map((data): RequestState<Owner> => ({ status: 'success', data })),
      startWith<RequestState<Owner>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Owner>>({ status: 'error', error }))
    );
  }

  private getOrCreateRequest$(
    key: string,
    owner: Partial<Owner>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Owner> {
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(owner, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    owner: Partial<Owner>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Owner> {
    const url =
      type === 'create'
        ? '/api/set/owners/create'
        : type === 'update'
          ? '/api/set/owners/update'
          : '/api/set/owners/delete';

    return this.http.post<Owner>(url, { owner }).pipe(
      catchError((error) => {
        console.error(`[OwnerSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(owner: Omit<Owner, 'id'>): string {
    const { studio, firstName, lastName, email } = owner;
    return `create:${studio}:${email}:${firstName}:${lastName}`;
  }
  
}
