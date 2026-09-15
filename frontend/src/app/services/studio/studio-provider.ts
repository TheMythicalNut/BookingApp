import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { LoadStudioOptions, Studio } from '../../models/models';
import { Observable, throwError} from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class StudioProvider {

  private readonly http = inject(HttpClient);

  constructor(){
  }
  
  private readonly _studios = signal<Studio[]>([]);
  readonly studios: Signal<Studio[]> = this._studios.asReadonly();
  
  readonly studiosById = new Map<string, Studio>();
  private readonly linkToId = new Map<string, string>();
  private readonly inFlightRequests = new Map<string, Observable<Studio> >();
  private readonly studioSignals = new Map<string, Signal<Studio | undefined>>();
  getStudioSignal(identifier: string, byLink = false): Signal<Studio | undefined> {
    const key = `${byLink ? 'link' : 'id'}:${identifier}`;
    
    const existing = this.studioSignals.get(key);
    if (existing) return existing;

    const signal = computed(() => {
      this.studios();
      
      const id = byLink
        ? this.linkToId.get(identifier)
        : identifier;

      if (!id) return undefined;
      return this.studiosById.get(id) ?? undefined;
    });

    this.studioSignals.set(key, signal);
    return signal;
  }

  ensureStudioLoaded(identifier: string, byLink = false): void {
    const cached = this.getFromCache(identifier, byLink);
    if (cached) return;

    const cacheKey = `${byLink ? 'link' : 'id'}:${identifier}`;
    if (this.inFlightRequests.has(cacheKey)) return;

    const request$: Observable<Studio> = (
      byLink
        ? this.loadStudioByLink(identifier)
        : this.loadStudioById(identifier)
    ).pipe(
      tap(studio =>{
        this.cacheStudio(studio) 
      }),
      finalize(() => this.inFlightRequests.delete(cacheKey)),
      shareReplay(1)
    );

    this.inFlightRequests.set(cacheKey, request$);

    request$.subscribe();
  }

  loadStudios(options: LoadStudioOptions): void {
    this.http.post<Studio[]>(`/api/studios`, { options })
    .pipe(
      tap(studios => { this.cacheStudios(studios) } ),
      catchError(err => this.handleError('loadStudios', err))
    ).subscribe();
  }

  loadStudiosById(ids: string[]): void {
    const missingIds = ids.filter(id => !this.studiosById.has(id));
    if (!missingIds.length) return;
    
    this.http.post<Studio[]>(`/api/studios/ids/`, {ids: missingIds})
    .pipe(
      tap(studios => { this.cacheStudios(studios) }),
      catchError(err => this.handleError('loadStudiosById', err))
    ).subscribe();
  }

  loadStudioById(id: string): Observable<Studio> {
    return this.http.get<Studio>(`/api/studios/id/${id}`)
    .pipe(catchError(err => this.handleError('loadStudioById', err)));
  }

  loadStudiosByOwners(entries: {owner: string, studioId: string}[]): void {
    const missingEntries = entries.filter(entry => !this.studiosById.has(entry.studioId) )
    if(!missingEntries.length) return;

    this.http.post<Studio[]>(`/api/studios/owners/`, {ids: missingEntries.map(i => i.owner)})
    .pipe(
      tap(studios => { this.cacheStudios(studios) }),
      catchError(err => this.handleError('loadStudiosByOwner', err))
    ).subscribe();;
  }

  loadStudioByLink(link: string): Observable<Studio> {
    return this.http.get<Studio>(`/api/studios/link/${link}`)
    .pipe(catchError(err => this.handleError('loadStudioByLink', err)));
  }

  clearAll(): void {
    this.studiosById.clear();
    this.linkToId.clear();
    this.inFlightRequests.clear();
    this.studioSignals.clear();
    this._studios.set([]);
  }

  update(studio: Studio){
    this.cacheStudio(studio);
  }

  private getFromCache( identifier: string, byLink: boolean): Studio | undefined {
    if (byLink) {
      const id = this.linkToId.get(identifier);
      return id ? this.studiosById.get(id) : undefined;
    }

    return this.studiosById.get(identifier);
  }

  private cacheStudios(studios: Studio[]): void {
    studios.forEach(studio => this.cacheStudio(studio, false));
    this.emitStudios();
  }

  private cacheStudio(studio: Studio, emit: boolean = true): void {
    this.studiosById.set(studio.id, studio);
    this.linkToId.set(studio.link, studio.id);
    if(emit) this.emitStudios();
  }

  private emitStudios(): void {
    this._studios.set(Array.from(this.studiosById.values()));
  }

  private handleError(source: string, error: unknown): Observable<never> {
    console.error(`[StudioProvider] ${source} failed`, error);
    return throwError(() => error);
  }
}