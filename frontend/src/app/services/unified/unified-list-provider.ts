import { computed, effect, inject, Injectable, provideAppInitializer, signal, Signal } from '@angular/core';
import { ServiceProvider } from '../service/service-provider';
import { StudioProvider } from '../studio/studio-provider';
import { PackageProvider } from '../package/package-provider';
import { Article, Filters, LoadOwnerOptions, LoadPackageOptions, LoadReservationOptions, LoadServiceOptions, LoadStudioOptions, Location, Package, Service, Studio } from '../../models/models';
import { UserProvider } from '../user/user';
import { distance } from '../../util/distance';
import { toMinutes } from '../../util/studio_hours';
import { ReservationProvider } from '../reservation/reservation-provider';
import { OwnerProvider } from '../owner/owner-provider';
import { LocationProvider } from '../location/location-provider';
import { cyrToLat, normalizeBase } from '../../util/search_utils';


@Injectable({
  providedIn: 'root',
})
export class UnifiedListProvider {
  private readonly serviceProvider = inject(ServiceProvider);
  private readonly studioProvider = inject(StudioProvider);
  private readonly packageProvider = inject(PackageProvider);
  private readonly reservationProvider = inject(ReservationProvider);
  private readonly ownerProvider = inject(OwnerProvider);
  private readonly userProvider = inject(UserProvider);
  private readonly locationProvider = inject(LocationProvider);

  private readonly _loading = signal<boolean>(false);
  readonly loading = this._loading.asReadonly();

  constructor(){
    this.setupEffects();
  }
  
  readonly filteredStudios: Signal<Studio[]> = computed(
    () => {
      const studios = this.studioProvider.studios();
      const filters = this.userProvider.filters();
      return this.filterStudios(studios, filters);
    },
    { equal: (a, b) => a.length === b.length && a.every((s, i) => s.id === b[i]?.id) }
  );
  readonly filteredArticles: Signal<Article[]> = computed(
    () => {
      const studios = this.studioProvider.studios();
      const services = this.serviceProvider.services();
      const packages = this.packageProvider.packages();
      const filters = this.userProvider.filters();
      return this.filterArticles(studios, services, packages, filters);
    },
    { equal: (a, b) => a.length === b.length && a.every((s, i) => s.id === b[i]?.id)}
  );

  readonly availableLocations: Signal<Location[]> = this.locationProvider.locations;

  // MAY NEED TO CHECK STUDIO DEPENDENCIES AS TO NOT SHOW STUDIOS THAT ARE STILL LOADING SERVICES/PACKAGES
  // IF ADDED, CHECK IF equal STILL WORKS
  private filterStudios(studios: Studio[], filters: Filters): Studio[] {
    if(!studios.length) return studios;

    const hasStudioType = !!filters.studioType;
    const hasSearch = !!filters.search;
    
    if(!hasStudioType && !hasSearch) return studios;

    const search = hasSearch? normalizeBase(cyrToLat(filters.search!).toLowerCase()) : null;
    const type = hasStudioType? filters.studioType : null;

    return studios.filter(studio => 
      (!hasStudioType || studio.type.includes(type!)) &&
      (!hasSearch || 
        normalizeBase(cyrToLat(studio.name).toLowerCase()).includes(search!) ||
        normalizeBase(cyrToLat(studio.link).toLowerCase()).includes(search!) ||
        normalizeBase(cyrToLat(studio.country).toLowerCase()).includes(search!) ||
        normalizeBase(cyrToLat(studio.city).toLowerCase()).includes(search!) ||
        normalizeBase(cyrToLat(studio.street).toLowerCase()).includes(search!) ||
        normalizeBase(cyrToLat(studio.buildingNumber).toLowerCase()).includes(search!) ||
        normalizeBase(cyrToLat(studio.apartmentNumber).toLowerCase()).includes(search!) ||
        studio.searchTags.some(tag => 
          normalizeBase(cyrToLat(tag).toLowerCase()).includes(search!))
      )
    );
  }

  // MAY NEED TO CHECK ARTICLE DEPENDENCIES AS TO NOT SHOW ARTICLES THAT ARE STILL LOADING STUDIOS/ARTICLES
  // IF ADDED, CHECK IF equal STILL WORKS
  private filterArticles( studios: Studio[], services: Service[], packages: Package[], filters: Filters
  ): Article[] {
    if (!services.length && !packages.length) { return [];}

    const hasLocation = !!filters.location;
    const hasServiceType = !!filters.serviceType;
    const hasTimeslot = !!filters.timeslot;

    const studiosMap = new Map( studios.map(s => [s.id, s]) );
    const servicesMap = new Map( services.map(s => [s.id, s]) );

    let filteredServices = services;
    let filteredPackages = packages;

    if (hasLocation) {
      const city = normalizeBase(cyrToLat(filters.location!.city).toLowerCase());
      const country = normalizeBase(cyrToLat(filters.location!.country).toLowerCase());

      filteredServices = filteredServices.filter(service => {
        const studio = studiosMap.get(service.studio);
        if (!studio) return false;

        return (
          normalizeBase(cyrToLat(studio.city).toLowerCase()).includes(city) ||
          normalizeBase(cyrToLat(studio.country).toLowerCase()).includes(country)
        );
      });

      filteredPackages = filteredPackages.filter(pkg => {
        const studio = studiosMap.get(pkg.studio);
        if (!studio) return false;

        return (
          normalizeBase(cyrToLat(studio.city).toLowerCase()).includes(city) ||
          normalizeBase(cyrToLat(studio.country).toLowerCase()).includes(country)
        );
      });
    }
    if (hasServiceType) {
      const serviceType = filters.serviceType!;
      filteredServices = filteredServices.filter(service =>
        service.type.includes(serviceType)
      );

      filteredPackages = filteredPackages.filter(pkg =>
        pkg.services.some(serviceId => {
          servicesMap.get(serviceId)?.type.includes(serviceType);
        })
      );
    }
    if(hasTimeslot){
      const timeslot = filters.timeslot!;
      const startDate = new Date(timeslot.startDate).toISOString();
      const endDate = new Date(timeslot.endDate).toISOString();
      
      filteredServices = filteredServices.filter(service => {
        const duration = service.duration
        if(!studiosMap.has(service.studio)) return false;
        
        const studio = studiosMap.get(service.studio);
        for(const a of studio!.available){
          if(a.date >= startDate && a.date <= endDate ){
            const tsStart = toMinutes(timeslot.start);
            const tsEnd = toMinutes(timeslot.end);
            for(const i of a.intervals){
              const iStart = toMinutes(i.start);
              const iEnd = toMinutes(i.end);
              const start = Math.max(tsStart, iStart);
              const end = Math.min(tsEnd, iEnd);
              if(end - start >= duration) return true;
            }
          }
        }
        return false;
      })
      filteredPackages = filteredPackages.filter(pkg => {
        const duration = pkg.duration
        if(!studiosMap.has(pkg.studio)) return false;
        const studio = studiosMap.get(pkg.studio);
        for(const a of studio!.available){
          if(a.date >= startDate && a.date <= endDate ){
            const tsStart = toMinutes(timeslot.start);
            const tsEnd = toMinutes(timeslot.end);
            for(const i of a.intervals){
              const iStart = toMinutes(i.start);
              const iEnd = toMinutes(i.end);
              if(iStart >= tsStart && iEnd <= tsEnd && iStart + duration <= iEnd) return true;
            }
          }
        }
        return false;
      })
    }

    let result: Article[] = [];
    const max = Math.max(filteredServices.length, filteredPackages.length);

    for (let i = 0; i < max; i++) {
      const service = filteredServices[i];
      const pkg = filteredPackages[i];
      if (service) result.push(service);
      if (pkg) result.push(pkg);
    }

    if(
      hasLocation && 
      filters.location!.latitude !== 0 && 
      filters.location!.longitude !== 0
    ){
      const {latitude, longitude} = filters.location!;

      return result.slice().sort((a,b)=>{
        if(a.studio === b.studio) return 0;

        const studioA = studiosMap.get(a.studio);
        const studioB = studiosMap.get(b.studio);
        
        if (!studioA || !studioB) return 0;

        const distA = distance(latitude, longitude, studioA.latitude, studioA.longitude);
        const distB = distance(latitude, longitude, studioB.latitude, studioB.longitude);

        return distA - distB;

      });
    };

    return result;
  }

  loadStudios(options: LoadStudioOptions): void {
    this._loading.set(true);
    this.studioProvider.loadStudios(options);
  }

  loadServices(options: LoadServiceOptions): void {
    this._loading.set(true);
    this.serviceProvider.loadServices(options);
  }

  loadPackages(options: LoadPackageOptions): void {
    this._loading.set(true);
    this.packageProvider.loadPackages(options);
  }

  loadReservations(options: LoadReservationOptions): void {
    this._loading.set(true);
    this.reservationProvider.loadReservations(options);
  }

  loadOwners(options: LoadOwnerOptions): void{
    this._loading.set(true);
    this.ownerProvider.loadOwners(options);
  }

  // private initialized = false;
  // init() {
  //   if(this.initialized) return;
  //   this.initialized = true;
  //   const token = this.userProvider.authtoken();
  //   if(token){
  //     const ownerOptions: LoadOwnerOptions = { token }
  //     this.loadOwners(ownerOptions)
  //   }
  //   else{
  //     const filters = this.userProvider.filters();
  //     const location = filters.location
  //     const serviceType = filters.serviceType
  //     const timeslot = filters.timeslot
  //     const options: LoadServiceOptions = Object.assign(
  //       { amount: 50 },
  //       { include: [], exclude: [] },
  //       timeslot && { timeslot },
  //       location && { location },
  //       serviceType && { serviceType }
  //     )

  //     this.loadServices(options);
  //   }
  // }

  private setupEffects(): void {

    effect(() => {
      const studios = this.studioProvider.studios();
      const serviceIds = studios.flatMap(s => s.services).filter(Boolean);
      const packageIds = studios.flatMap(s => s.packages).filter(Boolean);
      if(serviceIds.length) {
        this.serviceProvider.loadServicesById(serviceIds);
      }
      if(packageIds.length) {
        this.packageProvider.loadPackagesById(packageIds);
      }
    })
    // ============================
    // OWNERS → STUDIOS + RESERVATIONS
    // ============================
    effect(() => {
      const owners = this.ownerProvider.owners();

      const ownerIds = owners.map(o => ({ owner: o.id, studioId: o.studio })).filter(Boolean);
      if(ownerIds.length){
        this.studioProvider.loadStudiosByOwners(ownerIds);
      }
    });

    // ============================
    // SERVICES → STUDIOS
    // ============================
    effect(() => {
      const services = this.serviceProvider.services();

      const studioIds = services
        .map(s => s.studio)
        .filter(Boolean);

      if (studioIds.length) {
        this.studioProvider.loadStudiosById(studioIds);
      }
    });

    // ============================
    // SERVICES → PREREQUISITES
    // ============================
    effect(() => {
      const services = this.serviceProvider.services();

      const prereqIds = services
        .map(s => s.prerequiredService)
        .filter(Boolean);

      if (prereqIds.length) {
        this.serviceProvider.loadServicesById(prereqIds);
      }
    });

    // ============================
    // PACKAGES → STUDIOS + SERVICES
    // ============================
    effect(() => {
      const packages = this.packageProvider.packages();

      if (!packages.length) return;

      const studioIds = packages.map(p => p.studio).filter(Boolean);
      const serviceIds = packages.flatMap(p => p.services ?? []);
      const prereqIds = packages.map(p => p.prerequiredService).filter(Boolean);

      if (studioIds.length) {
        this.studioProvider.loadStudiosById(studioIds);
      }

      if (serviceIds.length || prereqIds.length) {
        this.serviceProvider.loadServicesById([
          ...serviceIds,
          ...prereqIds
        ]);
      }
    });

    // ============================
    // RESERVATIONS → STUDIOS + SERVICES + PACKAGES
    // ============================
    effect(() => {
      const reservations = this.reservationProvider.reservations();
      if(!reservations.length) return;
      const studioIds = reservations.map(p => p.studio).filter(Boolean);
      const serviceIds = reservations.map(p => p.service).filter(Boolean);
      const packagesIds = reservations.map(p => p.package).filter(Boolean);
      
      if (studioIds.length) {
        this.studioProvider.loadStudiosById(studioIds);
      }

      if (serviceIds.length) {
        this.serviceProvider.loadServicesById(serviceIds);
      }

      if(packagesIds.length) {
        this.packageProvider.loadPackagesById(packagesIds);
      }
    })

    // ============================
    // LOADING STABILIZATION
    // ============================
    effect(() => {
      const studios = this.studioProvider.studios();
      const services = this.serviceProvider.services();
      const packages = this.packageProvider.packages();

      if (studios.length || services.length || packages.length) {
        this._loading.set(false);
      }
    });
  }

}

export function provideListProviderInitializer() {
  return provideAppInitializer(()=>{
    const listProvider = inject(UnifiedListProvider);
    //listProvider.init();
  })
}