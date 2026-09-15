import { Injectable, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, finalize, map, of, shareReplay, startWith, throwError } from 'rxjs';
import { RequestState, Package } from '../../models/models';
import { SetterContract } from '../unified/unified-setter';


export type PackageDiff = {
  toInsert: Package[];
  toUpdate: Package[];
  toDelete: string[];
};

@Injectable({
  providedIn: 'root',
})
export class PackageSetter implements SetterContract<Package> {
  private readonly http = inject(HttpClient);

  private readonly inFlightRequests = new Map<string, Observable<Package> | Observable<Package[]>>();

  updateMany(diff: PackageDiff): Observable<RequestState<Package[]>> {
    const key = `updateMany:packages`;
    const existing = this.inFlightRequests.get(key) as Observable<Package[]> | undefined;

    if (existing) {
      return existing.pipe(
        map((data): RequestState<Package[]> => ({ status: 'success', data })),
        startWith<RequestState<Package[]>>({ status: 'loading' }),
        catchError((error) => of<RequestState<Package[]>>({ status: 'error', error }))
      );
    }

    const request$ = this.http.post<Package[]>('/api/set/packages/update-many', { diff }).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => this.inFlightRequests.delete(key)),
      catchError((error) => {
        console.error('[PackageSetter] updateMany failed', error);
        return throwError(() => error);
      })
    );

    this.inFlightRequests.set(key, request$);

    return request$.pipe(
      map((data): RequestState<Package[]> => ({ status: 'success', data })),
      startWith<RequestState<Package[]>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Package[]>>({ status: 'error', error }))
    );
  }

  create(pkg:  Omit<Package, 'id'>): Observable<RequestState<Package>> {
    const key = this.createKey(pkg);
    const request$ = this.getOrCreateRequest$(key, pkg, 'create');
    return request$.pipe(
      map((data): RequestState<Package> => ({ status: 'success', data })),
      startWith<RequestState<Package>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Package>>({ status: 'error', error }))
    );
  }

  update(pkg: Partial<Package> & { id: string }): Observable<RequestState<Package>> {
    const key = `update:${pkg.id}`;
    const request$ = this.getOrCreateRequest$(key, pkg, 'update');
    return request$.pipe(
      map((data): RequestState<Package> => ({ status: 'success', data })),
      startWith<RequestState<Package>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Package>>({ status: 'error', error }))
    );
  }

  delete(pkg: Partial<Package> & { id: string}): Observable<RequestState<Package>> {
    const key = `delete:${pkg.id}`
    const request$ = this.getOrCreateRequest$(key, pkg, 'delete');
    return request$.pipe(
      map((data): RequestState<Package> => ({ status: 'success', data })),
      startWith<RequestState<Package>>({ status: 'loading' }),
      catchError((error) => of<RequestState<Package>>({ status: 'error', error }))
    );
  }
  
  private getOrCreateRequest$(
    key: string,
    pkg: Partial<Package>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Package> {
    const existing = this.inFlightRequests.get(key) as Observable<Package>;
    if (existing) {
      return existing;
    }

    const request$ = this.postRequest(pkg, type).pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
      finalize(() => {
        this.inFlightRequests.delete(key);
      })
    );

    this.inFlightRequests.set(key, request$);
    return request$;
  }

  private postRequest(
    pkg: Partial<Package>,
    type: 'create' | 'update' | 'delete'
  ): Observable<Package> {
    const url =
      type === 'create'
        ? '/api/set/packages/create'
        : type === 'update'
          ? '/api/set/packages/update'
          : '/api/set/packages/delete';

    return this.http.post<Package>(url, { pkg }).pipe(
      catchError((error) => {
        console.error(`[PackageSetter] ${type} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private createKey(pkg: Omit<Package, 'id'>): string {
    const { studio, name, services } = pkg;
    return `create:${studio}:${name}:${services.join()}`;
  }
}
