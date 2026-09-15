import { inject, Injectable } from '@angular/core';
import { SetterContract } from '../unified/unified-setter';
import { Category, RequestState } from '../../models/models';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, shareReplay, startWith, throwError } from 'rxjs';

export type CategoryDiff = {
  toInsert: Category[];
  toUpdate: Category[];
  toDelete: string[];
};

@Injectable({
  providedIn: 'root',
})
export class CategorySetter implements SetterContract<Category> {
  
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<Category | Category[]>>();

  updateMany(diff: CategoryDiff): Observable<RequestState<Category[]>> {
    const key = `updateMany:categories`;
    const existing = ( this.inFlightRequests.get(key) ) as ( Observable<Category[]> | undefined );
    if (existing) {
      return existing.pipe(
        map((data): RequestState<Category[]> => ({ status: 'success', data })),
        startWith<RequestState<Category[]>>({ status: 'loading' }),
        catchError((error) => of<RequestState<Category[]>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<Category[]>(
      '/api/set/categories/update-many', 
      { diff }
    ).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[CategorySetter] updateMany failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<Category[]> => ({ status: 'success', data })),
      startWith<RequestState<Category[]>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Category[]>>({ status: 'error', error }))
    );
  }

  create(category: Omit<Category, 'id'>): Observable<RequestState<Category>> {
    const key = this.createKey(category);
    const request$ = this.getOrCreateRequest$(key, category, 'create');
    return request$.pipe(
      map((data): RequestState<Category> => ({ status: 'success', data })),
      startWith<RequestState<Category>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Category>>({ status: 'error', error }))
    );
  }

  update(category: Partial<Category> & { id: string }): Observable<RequestState<Category>> {
    const key = `update:${category.id}`;
    const request$ = this.getOrCreateRequest$(key, category, 'update');
    return request$.pipe(
      map((data): RequestState<Category> => ({ status: 'success', data })),
      startWith<RequestState<Category>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Category>>({ status: 'error', error }))
    );
  }


  delete(category: Partial<Category> & { id: string}): Observable<RequestState<Category>> {
    const key = `delete:${category.id}`
    const request$ = this.getOrCreateRequest$(key, category, 'delete');
    return request$.pipe(
      map((data): RequestState<Category> => ({ status: 'success', data })),
      startWith<RequestState<Category>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Category>>({ status: 'error', error }))
    );
  }
  
  private getOrCreateRequest$(
    key: string,
    category: Partial<Category>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Category> {
    const existing = this.inFlightRequests.get(key) as ( Observable<Category> | undefined ) ;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(category, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    category: Partial<Category>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Category> {
    const url =
      type === 'create'
        ? '/api/set/categories/create'
        : type === 'update'
          ? '/api/set/categories/update'
          : '/api/set/categories/delete';

    return this.http.post<Category>(url, { category }).pipe(
      catchError((error) => {
        console.error(`[CategorySetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(category: Omit<Category, 'id'>): string {
    const { name, studio } = category;
    return `create:${studio}:${name}`;
  }
}