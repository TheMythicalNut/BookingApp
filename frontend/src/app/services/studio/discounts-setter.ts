import { inject, Injectable } from '@angular/core';
import { Discount, RequestState } from '../../models/models';
import { catchError, finalize, map, Observable, of, shareReplay, startWith, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export type DiscountsDiff = {
  toInsert: Discount[];
  toUpdate: Discount[];
  toDelete: string[];
};

@Injectable({
  providedIn: 'root',
})
export class DiscountsSetter {
    
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<Discount | Discount[]>>();

  updateMany(diff: DiscountsDiff): Observable<RequestState<Discount[]>> {
    const key = `updateMany:discounts`;
    const existing = ( this.inFlightRequests.get(key) ) as ( Observable<Discount[]> | undefined );
    if (existing) {
      return existing.pipe(
        map((data): RequestState<Discount[]> => ({ status: 'success', data })),
        startWith<RequestState<Discount[]>>({ status: 'loading' }),
        catchError((error) => of<RequestState<Discount[]>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<Discount[]>(
      '/api/set/discounts/update-many', 
      { diff }
    ).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[DiscountSetter] updateMany failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<Discount[]> => ({ status: 'success', data })),
      startWith<RequestState<Discount[]>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Discount[]>>({ status: 'error', error }))
    );
  }

  create(discount: Omit<Discount, 'id'>): Observable<RequestState<Discount>> {
    const key = this.createKey(discount);
    const request$ = this.getOrCreateRequest$(key, discount, 'create');
    return request$.pipe(
      map((data): RequestState<Discount> => ({ status: 'success', data })),
      startWith<RequestState<Discount>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Discount>>({ status: 'error', error }))
    );
  }

  update(discount: Partial<Discount> & { id: string }): Observable<RequestState<Discount>> {
    const key = `update:${discount.id}`;
    const request$ = this.getOrCreateRequest$(key, discount, 'update');
    return request$.pipe(
      map((data): RequestState<Discount> => ({ status: 'success', data })),
      startWith<RequestState<Discount>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Discount>>({ status: 'error', error }))
    );
  }


  delete(discount: Partial<Discount> & { id: string}): Observable<RequestState<Discount>> {
    const key = `delete:${discount.id}`
    const request$ = this.getOrCreateRequest$(key, discount, 'delete');
    return request$.pipe(
      map((data): RequestState<Discount> => ({ status: 'success', data })),
      startWith<RequestState<Discount>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Discount>>({ status: 'error', error }))
    );
  }
  
  private getOrCreateRequest$(
    key: string,
    discount: Partial<Discount>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Discount> {
    const existing = this.inFlightRequests.get(key) as ( Observable<Discount> | undefined ) ;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(discount, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    discount: Partial<Discount>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Discount> {
    const url =
      type === 'create'
        ? '/api/set/discounts/create'
        : type === 'update'
          ? '/api/set/discounts/update'
          : '/api/set/discounts/delete';

    return this.http.post<Discount>(url, { discount }).pipe(
      catchError((error) => {
        console.error(`[DiscountSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(discount: Omit<Discount, 'id'>): string {
    const { article, percentage } = discount;
    return `create:${article}:${percentage}`;
  }
}
