import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal, Signal } from '@angular/core';
import { Observable, throwError} from 'rxjs';
import { LoadServiceOptions, Service} from '../../models/models';
import { getRandomServiceKeys } from '../../CONST';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ServiceProvider {

//   // TEST DATA
//   exampleService0: Service = {
//     id:'0',
//     name: 'Tirkizno',
//     link: 'tirkizno',
//     price:'2.299,00', currency: 'RSD', discount: 15, duration: 30,
//     description: `Precizno oblikovanje noktiju, potiskivanje i uklanjanje viška kutikule, poliranje nokatne ploče i završna nega ruku.
// Po potrebi se vrši blago poliranje radi zaglađivanja neravnina i poboljšanja izgleda nokta.
// Usluga se završava hranljivim uljem za kutikulu i kremom za ruke, što ostavlja kožu mekanom, a nokte negovanim. 
// Klasični manikir je idealan za svakodnevnu urednost, poslovni izgled i klijente koji žele prirodne nokte bez gela ili trajnih premaza.`,
//     prerequirement: '1',
//     thumbnail:'https://picsum.photos/seed/sfd8/640/640',
//     images: [
//       { timestamp: 1768479887168, url: 'https://picsum.photos/seed/mcxzn01/640/640' },
//       { timestamp: 1768379887168, url: 'https://picsum.photos/seed/mcxzn02/640/640' },
//       { timestamp: 1768279887168, url: 'https://picsum.photos/seed/mcxzn03/640/640' },
//       { timestamp: 1768179887168, url: 'https://picsum.photos/seed/mcxzn04/640/640' },
//       { timestamp: 1768079887168, url: 'https://picsum.photos/seed/mcxzn05/640/640' },
//       { timestamp: 1767979887168, url: 'https://picsum.photos/seed/mcxzn06/640/640' },
//       { timestamp: 1767879887168, url: 'https://picsum.photos/seed/mcxzn07/640/640' },
//       { timestamp: 1767779887168, url: 'https://picsum.photos/seed/mcxzn08/640/640' },
//       { timestamp: 1767679887168, url: 'https://picsum.photos/seed/mcxzn09/640/640' },
//       { timestamp: 1767579887168, url: 'https://picsum.photos/seed/mcxzn010/640/640' },
//       { timestamp: 1767879887168, url: 'https://picsum.photos/seed/mcxzn07/640/640' },
//       { timestamp: 1767779887168, url: 'https://picsum.photos/seed/mcxzn08/640/640' },
//       { timestamp: 1767679887168, url: 'https://picsum.photos/seed/mcxzn09/640/640' },
//       { timestamp: 1767579887168, url: 'https://picsum.photos/seed/mcxzn010/640/640' },
//       { timestamp: 1767579887168, url: 'https://picsum.photos/seed/mcxzn010/640/640' },
//       { timestamp: 1767879887168, url: 'https://picsum.photos/seed/mcxzn07/640/640' },
//       { timestamp: 1767779887168, url: 'https://picsum.photos/seed/mcxzn08/640/640' },
//       { timestamp: 1767679887168, url: 'https://picsum.photos/seed/mcxzn09/640/640' },
//       { timestamp: 1767579887168, url: 'https://picsum.photos/seed/mcxzn010/640/640' },
//     ],
//     isReservable: true, 
//     addons: [],
//     type:['0', '1'],
//     packages: [],
//     studio: '0'
//   }
//   exampleService1: Service = {
//     id:'1',
//     name: 'Consultation',
//     link: 'konsultacija',
//     price:'1.299,00', currency: 'RSD', discount: 0, duration: 30,
//     description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
//     prerequirement: '',
//     thumbnail:'https://picsum.photos/seed/sfd9/640/640',
//     images: [
//       { timestamp: 1768479887168, url: 'https://picsum.photos/seed/mcxzn11/640/640' },
//       { timestamp: 1768379887168, url: 'https://picsum.photos/seed/mcxzn12/640/640' },
//       { timestamp: 1768279887168, url: 'https://picsum.photos/seed/mcxzn13/640/640' },
//       { timestamp: 1768179887168, url: 'https://picsum.photos/seed/mcxzn14/640/640' },
//       { timestamp: 1768079887168, url: 'https://picsum.photos/seed/mcxzn15/640/640' },
//       { timestamp: 1767979887168, url: 'https://picsum.photos/seed/mcxzn16/640/640' },
//       { timestamp: 1767879887168, url: 'https://picsum.photos/seed/mcxzn17/640/640' },
//       { timestamp: 1767779887168, url: 'https://picsum.photos/seed/mcxzn18/640/640' },
//       { timestamp: 1767679887168, url: 'https://picsum.photos/seed/mcxzn19/640/640' },
//       { timestamp: 1767579887168, url: 'https://picsum.photos/seed/mcxzn110/640/640' },
//     ],
//     isReservable: true,  
//     addons: [],
//     type:['0', '1'],
//     packages: [],
//     studio: '0',
//   }
//   examplesArray: Service[] = Array.from({ length: 20 }, (_, i) => ({
//     id: String(i + 2),
//     thumbnail: `https://picsum.photos/seed/sfd${2 + i}/640/640`,
//     name: `Service ${i + 2}`,
//     link: `service${i + 2}`,
//     type: getRandomServiceKeys(),
//     price:`${2_499 + (i % 5) * 300},00`, currency: 'RSD', discount: 0, duration: 30,
//     description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`,
//     prerequirement: '',
//     images: [],
//     isReservable: true, 
//     addons: [],
//     packages: [],
//     studio: '0',
//   }))
//   // TEST DATA

  private readonly http = inject(HttpClient);

  constructor(){
    //this.cacheService(this.exampleService0);
    //this.cacheService(this.exampleService1);
    //this.cacheServices(this.examplesArray);
  }

  private readonly _services = signal<Service[]>([]);
  readonly services: Signal<Service[]> = this._services.asReadonly();

  readonly servicesById = new Map<string, Service>();
  private readonly linkToId = new Map<string, string>();
  private readonly inFlightRequests = new Map<string, Observable<Service>>();
  private readonly serviceSignals = new Map<string, Signal<Service | undefined>>();
  getServiceSignal(identifier: string, byLink = false): Signal<Service | undefined> {
    const key = `${byLink ? 'link' : 'id'}:${identifier}`;
    
    const existing = this.serviceSignals.get(key);
    if (existing) return existing;

    const signal = computed(() => {
      this.services();
      const id = byLink
        ? this.linkToId.get(identifier)
        : identifier;

      if (!id) return undefined;
      return this.servicesById.get(id) ?? undefined;
    });

    this.serviceSignals.set(key, signal);
    return signal;
  }

  ensureServiceLoaded(identifier: string, byLink = false): void {
    const cached = this.getFromCache(identifier, byLink);
    if (cached) return;

    const cacheKey = `${byLink ? 'link' : 'id'}:${identifier}`;
    if (this.inFlightRequests.has(cacheKey)) return;

    const request$: Observable<Service>  = (
      byLink
        ? this.loadServiceByLink(identifier)
        : this.loadServiceById(identifier)
    ).pipe(
      tap(service => this.cacheService(service)),
      finalize(() => this.inFlightRequests.delete(cacheKey)),
      shareReplay(1)
    );

    this.inFlightRequests.set(cacheKey, request$);

    request$.subscribe();
  }

  loadServices(options: LoadServiceOptions): void {
    this.http.post<Service[]>(`/api/services`, { options }).pipe(
      tap(services => { this.cacheServices(services) }),
      catchError(err => this.handleError('loadServices', err))
    ).subscribe();
  }

  loadServicesById(ids: string[]): void {
    const missingIds = ids.filter(id => !this.servicesById.has(id));
    if (!missingIds.length) return;

    this.http.post<Service[]>(
      `/api/services/ids/`,
      { ids: missingIds }
    ).pipe(
      tap(services => this.cacheServices(services)),
      catchError(err => this.handleError('loadServicesById', err))
    ).subscribe();
  }

  clearAll(): void {
    this.servicesById.clear();
    this.linkToId.clear();
    this.inFlightRequests.clear();
    this.serviceSignals.clear();
    this._services.set([]);
  }
  
  update(service: Service){
    this.cacheService(service);
  }

  private loadServiceById(id: string): Observable<Service> {
    return this.http.get<Service>(`/api/services/id/${id}`).pipe(
      catchError(err => this.handleError('loadServiceById', err))
    );
  }

  private loadServiceByLink(link: string): Observable<Service> {
    return this.http.get<Service>(`/api/services/link/${link}`).pipe(
      catchError(err => this.handleError('loadServiceByLink', err))
    );
  }

  private getFromCache(identifier: string, byLink: boolean): Service | undefined {
    if (byLink) {
      const id = this.linkToId.get(identifier);
      return id ? this.servicesById.get(id) : undefined;
    }

    return this.servicesById.get(identifier);
  }

  private cacheServices(services: Service[]): void {
    services.forEach(service => this.cacheService(service, false));
    this.emitServices();
  }

  private cacheService(service: Service, emit = true): void {
    this.servicesById.set(service.id, service);
    this.linkToId.set(service.link, service.id);

    if (emit) {
      this.emitServices();
    }
  }

  private emitServices(): void {
    this._services.set(Array.from(this.servicesById.values()));
  }

  private handleError(source: string, error: unknown): Observable<never> {
    console.error(`[ServiceProvider] ${source} failed`, error);
    return throwError(() => error);
  }
}