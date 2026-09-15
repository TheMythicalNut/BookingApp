import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, map, of, shareReplay, startWith, throwError } from 'rxjs';
import { RequestState, Service } from '../../models/models';
import { SetterContract } from '../unified/unified-setter';

export type ServiceDiff = {
  toInsert: Service[];
  toUpdate: Service[];
  toDelete: string[];
};

@Injectable({
  providedIn: 'root',
})
export class ServiceSetter implements SetterContract<Service> {
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<Service> | Observable<Service[]>>();

  updateMany(formData: FormData): Observable<RequestState<Service[]>> {
    const key = `updateMany:services`;
    const existing = this.inFlightRequests.get(key) as Observable<Service[]> | undefined;

    if (existing) {
      return existing.pipe(
        map((data): RequestState<Service[]> => ({ status: 'success', data })),
        startWith<RequestState<Service[]>>({ status: 'loading' }),
        catchError((error) => of<RequestState<Service[]>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<Service[]>(
      '/api/set/services/update-many',
      formData   // FormData — Angular sets Content-Type automatically
    ).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[ServiceSetter] updateMany failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<Service[]> => ({ status: 'success', data })),
      startWith<RequestState<Service[]>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Service[]>>({ status: 'error', error }))
    );
  }

  create(service: Omit<Service, 'id'>): Observable<RequestState<Service>> {
    const key = this.createKey(service);
    const request$ = this.getOrCreateRequest$(key, service, 'create');
    return request$.pipe(
      map((data): RequestState<Service> => ({ status: 'success', data })),
      startWith<RequestState<Service>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Service>>({ status: 'error', error }))
    );
  }

  update(service: Partial<Service> & { id: string }): Observable<RequestState<Service>> {
    const key = `update:${service.id}`;
    const request$ = this.getOrCreateRequest$(key, service, 'update');
    return request$.pipe(
      map((data): RequestState<Service> => ({ status: 'success', data })),
      startWith<RequestState<Service>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Service>>({ status: 'error', error }))
    );
  }

  delete(service: Partial<Service> & { id: string}): Observable<RequestState<Service>> {
    const key = `delete:${service.id}`
    const request$ = this.getOrCreateRequest$(key, service, 'delete');
    return request$.pipe(
      map((data): RequestState<Service> => ({ status: 'success', data })),
      startWith<RequestState<Service>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Service>>({ status: 'error', error }))
    );
  }

  private getOrCreateRequest$(
    key: string,
    service: Partial<Service>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Service> {
    const existing = this.inFlightRequests.get(key) as Observable<Service>;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(service, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    service: Partial<Service>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Service> {
    const url =
      type === 'create'
        ? '/api/set/services/create'
        : type === 'update'
          ? '/api/set/services/update'
          : '/api/set/services/delete';

    return this.http.post<Service>(url, { service }).pipe(
      catchError((error) => {
        console.error(`[ServiceSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(service: Omit<Service, 'id'>): string {
    const { studio, name, type } = service;
    return `create:${studio}:${name}:${type.join()}`;
  }
  
}
