import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, map, of, shareReplay, startWith, throwError } from 'rxjs';
import { RequestState, Studio } from '../../models/models';
import { SetterContract } from '../unified/unified-setter';


@Injectable({
  providedIn: 'root',
})
export class StudioSetter implements SetterContract<Studio> {
  
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<Studio>>();

  updateMedia(formData: FormData): Observable<RequestState<Studio>> {
    const key = `updateMedia:studio`;
    const existing = this.inFlightRequests.get(key);

    if (existing) {
      return existing.pipe(
        map((data): RequestState<Studio> => ({ status: 'success', data })),
        startWith<RequestState<Studio>>({ status: 'loading' }),
        catchError((error) => of<RequestState<Studio>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<Studio>('/api/studios/media/upload', formData).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[StudioSetter] updateMedia failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<Studio> => ({ status: 'success', data })),
      startWith<RequestState<Studio>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Studio>>({ status: 'error', error }))
    );
  }

  update(studio: Partial<Studio> & { id: string }): Observable<RequestState<Studio>> {
    const key = `update:${studio.id}`;
    const request$ = this.getOrCreateRequest$(key, studio, 'update');
    return request$.pipe(
      map((data): RequestState<Studio> => ({ status: 'success', data })),
      startWith<RequestState<Studio>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Studio>>({ status: 'error', error }))
    );
  }

  private getOrCreateRequest$(
    key: string,
    studio: Partial<Studio>,
    type: 'update' | 'delete'
  ): Observable<Studio> {
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(studio, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    studio: Partial<Studio>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Studio> {
    const url =
      type === 'create'
        ? '/api/set/studios/create'
        : type === 'update'
          ? '/api/set/studios/update'
          : '/api/set/studios/delete';

    return this.http.post<Studio>(url, { studio }).pipe(
      catchError((error) => {
        console.error(`[StudioSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }
  private requestStateSignal(request$: Observable<Studio>): Signal<RequestState<Studio>> {
    const state$: Observable<RequestState<Studio>> = request$.pipe(
      map((data): RequestState<Studio> => ({
        status: 'success',
        data,
      })),
      startWith<RequestState<Studio>>({ status: 'loading' }),
      catchError((error) =>
        of<RequestState<Studio>>({ status: 'error', error })
      )
    );

    return toSignal(state$, { initialValue: { status: 'idle' } });
  }
  // Intentionally not implemented methods
  create(payload: Omit<Studio, 'id'> & { id?: string; }): Observable<RequestState<Studio>> {
    throw new Error('Method Not Supported.');
  }
  delete(payload: { id: string; } & Partial<Studio>): Observable<RequestState<Studio>> {
    throw new Error('Method Not Supported.');
  }
}