import { inject, Injectable } from '@angular/core';
import { RequestState, ScheduleException } from '../../models/models';
import { catchError, finalize, map, Observable, of, shareReplay, startWith, throwError } from 'rxjs';
import { SetterContract } from '../unified/unified-setter';
import { HttpClient } from '@angular/common/http';


export type ExceptionDiff = {
  toInsert: ScheduleException[];
  toUpdate: ScheduleException[];
  toDelete: string[];
};

@Injectable({
  providedIn: 'root',
})
export class ScheduleExceptionsSetter implements SetterContract<ScheduleException> {
  
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<ScheduleException> | Observable<ScheduleException[]>>();

  updateMany(diff: ExceptionDiff): Observable<RequestState<ScheduleException[]>> {
    const key = `updateMany:exceptions`;
    const existing = ( this.inFlightRequests.get(key) ) as ( Observable<ScheduleException[]> | undefined );
    if (existing) {
      return existing.pipe(
        map((data): RequestState<ScheduleException[]> => ({ status: 'success', data })),
        startWith<RequestState<ScheduleException[]>>({ status: 'loading' }),
        catchError((error) => of<RequestState<ScheduleException[]>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<ScheduleException[]>(
      '/api/set/exceptions/update-many', 
      { diff }
    ).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[ScheduleExceptionSetter] updateMany failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<ScheduleException[]> => ({ status: 'success', data })),
      startWith<RequestState<ScheduleException[]>>({ status: 'loading' }),
      catchError((error) => of<RequestState<ScheduleException[]>>({ status: 'error', error }))
    );
  }

  create(exception: Omit<ScheduleException, 'id'>): Observable<RequestState<ScheduleException>> {
    const key = this.createKey(exception);
    const request$ = this.getOrCreateRequest$(key, exception, 'create');
    return request$.pipe(
      map((data): RequestState<ScheduleException> => ({ status: 'success', data })),
      startWith<RequestState<ScheduleException>>({ status: 'loading' }),
      catchError((error) => of<RequestState<ScheduleException>>({ status: 'error', error }))
    );
  }

  update(exception: Partial<ScheduleException> & { id: string }): Observable<RequestState<ScheduleException>> {
    const key = `update:${exception.id}`;
    const request$ = this.getOrCreateRequest$(key, exception, 'update');
    return request$.pipe(
      map((data): RequestState<ScheduleException> => ({ status: 'success', data })),
      startWith<RequestState<ScheduleException>>({ status: 'loading' }),
      catchError((error) => of<RequestState<ScheduleException>>({ status: 'error', error }))
    );
  }


  delete(exception: Partial<ScheduleException> & { id: string}): Observable<RequestState<ScheduleException>> {
    const key = `delete:${exception.id}`
    const request$ = this.getOrCreateRequest$(key, exception, 'delete');
    return request$.pipe(
      map((data): RequestState<ScheduleException> => ({ status: 'success', data })),
      startWith<RequestState<ScheduleException>>({ status: 'loading' }),
      catchError((error) => of<RequestState<ScheduleException>>({ status: 'error', error }))
    );
  }
  
  private getOrCreateRequest$(
    key: string,
    exception: Partial<ScheduleException>,
    type: 'create' | 'update' | 'delete'
  ): Observable<ScheduleException> {
    const existing = this.inFlightRequests.get(key) as ( Observable<ScheduleException> | undefined ) ;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(exception, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    exception: Partial<ScheduleException>,
    type: 'create' | 'update' | 'delete'
  ): Observable<ScheduleException> {
    const url =
      type === 'create'
        ? '/api/set/exceptions/create'
        : type === 'update'
          ? '/api/set/exceptions/update'
          : '/api/set/exceptions/delete';

    return this.http.post<ScheduleException>(url, { exception }).pipe(
      catchError((error) => {
        console.error(`[ScheduleExceptionSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(exception: Omit<ScheduleException, 'id'>): string {
    const { appliesTo, isClosed } = exception;
    return `create:${appliesTo.type}:${isClosed}`;
  }
}