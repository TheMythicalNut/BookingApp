import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { LoadPackageOptions, Package } from '../../models/models';
import { catchError, finalize, Observable, shareReplay, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PackageProvider {
  // // TEST DATA
  // examplePackage0: Package = {
  //   id: '0',
  //   name: 'Signatura',
  //   link: 'signatura',
  //   price: '9.999,00',
  //   currency: 'RSD',
  //   discount: 0,
  //   duration: 90,
  //   services: ['0', '1', '2'],
  //   description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`,
  //   prerequirement: '',
  //   studio: '0',
  //   isReservable: true, 
  //   addons: [],
  // }
  // examplePackage1: Package = {
  //   id: '1',
  //   name: 'ManiPedi',
  //   link: 'manipedi',
  //   price: '4.499,00',
  //   currency: 'RSD',
  //   discount: 25,
  //   duration: 120,
  //   services: ['1', '2', '3', '4'],
  //   description: `It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).`,
  //   prerequirement: '0',
  //   studio: '0',
  //   isReservable: false, 
  //   addons: [],
  // }
  // examplesArray: Package[] = Array.from({ length: 5 }, (_, i) => ({
  //   id: String(i + 2),
  //   name: `Package ${i + 2}`,
  //   link: `package${i + 2}`,
  //   price:`${2_499 + (i % 5) * 300},00`, currency: 'RSD', discount: 0, duration: 30,
  //   services: Array.from({length: Math.max(1, Math.ceil(Math.random() * 5)) }, (_, i)=> ( Math.ceil(Math.random() * 20).toString() )),
  //   description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
  //   prerequirement: '',
  //   studio: '0',
  //   isReservable: true,
  //   addons: [],
  // }))
  // // TEST DATA

  private readonly http = inject(HttpClient);

  constructor(){
    //this.cachePackage(this.examplePackage0);
    //this.cachePackage(this.examplePackage1);
    //this.cachePackages(this.examplesArray);
  }

  private readonly _packages = signal<Package[]>([]);
  readonly packages: Signal<Package[]> = this._packages.asReadonly();

  readonly packagesById = new Map<string, Package>();
  private readonly linkToId = new Map<string, string>();
  private readonly inFlightRequests = new Map<string, Observable<Package>>();
  private readonly packageSignals = new Map<string, Signal<Package | undefined>>();
  getPackageSignal(identifier: string, byLink = false): Signal<Package | undefined> {
    const key = `${byLink ? 'link' : 'id'}:${identifier}`;
    
    const existing = this.packageSignals.get(key);
    if (existing) return existing;

    const signal = computed(() => {
      this.packages();
      const id = byLink
        ? this.linkToId.get(identifier)
        : identifier;

      if (!id) return undefined;
      return this.packagesById.get(id) ?? undefined;
    });

    this.packageSignals.set(key, signal);
    return signal;
  }

  ensurePackageLoaded(identifier: string, byLink = false): void {
    const cached = this.getFromCache(identifier, byLink);
    if (cached) return;

    const cacheKey = `${byLink ? 'link' : 'id'}:${identifier}`;
    if (this.inFlightRequests.has(cacheKey)) return;

    const request$: Observable<Package> = (
      byLink
        ? this.loadPackageByLink(identifier)
        : this.loadPackageById(identifier)
    ).pipe(
      tap(pkg => this.cachePackage(pkg)),
      finalize(() => this.inFlightRequests.delete(cacheKey)),
      shareReplay(1)
    );

    this.inFlightRequests.set(cacheKey, request$);

    request$.subscribe();
  }

  loadPackages(options: LoadPackageOptions): void {
    this.http.post<Package[]>(`/api/packages`, { options }).pipe(
      tap(packages => this.cachePackages(packages)),
      catchError(err => this.handleError('loadPackages', err))
    ).subscribe();
  }

  loadPackagesById(ids: string[]): void {
    const missingIds = ids.filter(id => !this.packagesById.has(id));
    if (!missingIds.length) return;

    this.http.post<Package[]>(
      `/api/packages/ids/`,
      { ids: missingIds }
    ).pipe(
      tap(packages => this.cachePackages(packages)),
      catchError(err => this.handleError('loadPackagesById', err))
    ).subscribe();
  }

  
  clearAll(): void {
    this.packagesById.clear();
    this.linkToId.clear();
    this.inFlightRequests.clear();
    this.packageSignals.clear();
    this._packages.set([]);
  }

  update(pkg: Package){
    this.cachePackage(pkg);
  }

  private loadPackageById(id: string): Observable<Package> {
    return this.http.get<Package>(`/api/packages/id/${id}`).pipe(
      catchError(err => this.handleError('loadPackageById', err))
    );
  }

  private loadPackageByLink(link: string): Observable<Package> {
    return this.http.get<Package>(`/api/packages/link/${link}`).pipe(
      catchError(err => this.handleError('loadPackageByLink', err))
    );
  }

  private getFromCache(identifier: string, byLink: boolean): Package | undefined {
    if (byLink) {
      const id = this.linkToId.get(identifier);
      return id ? this.packagesById.get(id) : undefined;
    }

    return this.packagesById.get(identifier);
  }

  private cachePackages(packages: Package[]): void {
    packages.forEach(pkg => this.cachePackage(pkg, false));
    this.emitPackages();
  }

  private cachePackage(pkg: Package, emit = true): void {
    this.packagesById.set(pkg.id, pkg);
    this.linkToId.set(pkg.link, pkg.id);

    if (emit) {
      this.emitPackages();
    }
  }

  private emitPackages(): void {
    this._packages.set(Array.from(this.packagesById.values()));
  }

  private handleError(source: string, error: unknown): Observable<never> {
    console.error(`[PackageProvider] ${source} failed`, error);
    return throwError(() => error);
  }
}
