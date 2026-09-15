import { inject, Injectable } from '@angular/core';
import { RequestState, WeeklySchedule } from '../../models/models';
import { SetterContract } from '../unified/unified-setter';
import { HttpClient } from '@angular/common/http';
import { Observable, map, startWith, catchError, of, shareReplay, finalize, throwError } from 'rxjs';


export type ScheduleDiff = {
  toInsert: WeeklySchedule[];
  toUpdate: WeeklySchedule[];
  toDelete: string[];
};

@Injectable({
  providedIn: 'root',
})
export class ScheduleSetter implements SetterContract<WeeklySchedule> {
  
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<WeeklySchedule | WeeklySchedule[]>>();

  updateMany(diff: ScheduleDiff): Observable<RequestState<WeeklySchedule[]>> {
    const key = `updateMany:schedules`;
    const existing = ( this.inFlightRequests.get(key) ) as ( Observable<WeeklySchedule[]> | undefined );
    if (existing) {
      return existing.pipe(
        map((data): RequestState<WeeklySchedule[]> => ({ status: 'success', data })),
        startWith<RequestState<WeeklySchedule[]>>({ status: 'loading' }),
        catchError((error) => of<RequestState<WeeklySchedule[]>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<WeeklySchedule[]>(
      '/api/set/schedules/update-many', 
      { diff }
    ).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[ScheduleSetter] updateMany failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<WeeklySchedule[]> => ({ status: 'success', data })),
      startWith<RequestState<WeeklySchedule[]>>({ status: 'loading' }),
      catchError((error) => of<RequestState<WeeklySchedule[]>>({ status: 'error', error }))
    );
  }

  create(schedule: Omit<WeeklySchedule, 'id'>): Observable<RequestState<WeeklySchedule>> {
    const key = this.createKey(schedule);
    const request$ = this.getOrCreateRequest$(key, schedule, 'create');
    return request$.pipe(
      map((data): RequestState<WeeklySchedule> => ({ status: 'success', data })),
      startWith<RequestState<WeeklySchedule>>({ status: 'loading' }),
      catchError((error) => of<RequestState<WeeklySchedule>>({ status: 'error', error }))
    );
  }

  update(schedule: Partial<WeeklySchedule> & { id: string }): Observable<RequestState<WeeklySchedule>> {
    const key = `update:${schedule.id}`;
    const request$ = this.getOrCreateRequest$(key, schedule, 'update');
    return request$.pipe(
      map((data): RequestState<WeeklySchedule> => ({ status: 'success', data })),
      startWith<RequestState<WeeklySchedule>>({ status: 'loading' }),
      catchError((error) => of<RequestState<WeeklySchedule>>({ status: 'error', error }))
    );
  }


  delete(schedule: Partial<WeeklySchedule> & { id: string}): Observable<RequestState<WeeklySchedule>> {
    const key = `delete:${schedule.id}`
    const request$ = this.getOrCreateRequest$(key, schedule, 'delete');
    return request$.pipe(
      map((data): RequestState<WeeklySchedule> => ({ status: 'success', data })),
      startWith<RequestState<WeeklySchedule>>({ status: 'loading' }),
      catchError((error) => of<RequestState<WeeklySchedule>>({ status: 'error', error }))
    );
  }
  
  private getOrCreateRequest$(
    key: string,
    schedule: Partial<WeeklySchedule>,
    type: 'create' | 'update' | 'delete'
  ): Observable<WeeklySchedule> {
    const existing = this.inFlightRequests.get(key) as ( Observable<WeeklySchedule> | undefined ) ;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(schedule, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    schedule: Partial<WeeklySchedule>,
    type: 'create' | 'update' | 'delete'
  ): Observable<WeeklySchedule> {
    const url =
      type === 'create'
        ? '/api/set/schedules/create'
        : type === 'update'
          ? '/api/set/schedules/update'
          : '/api/set/schedules/delete';

    return this.http.post<WeeklySchedule>(url, { schedule }).pipe(
      catchError((error) => {
        console.error(`[ScheduleSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(schedule: Omit<WeeklySchedule, 'id'>): string {
    const { days } = schedule;
    return `create:${days}`;
  }
}