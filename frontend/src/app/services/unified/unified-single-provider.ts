import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { isOwner, isPackage, isReservation, isService, isStudio, Owner, Package, Reservation, Service, Studio } from '../../models/models';
import { StudioProvider } from '../studio/studio-provider';
import { ServiceProvider } from '../service/service-provider';
import { PackageProvider } from '../package/package-provider';
import { ReservationProvider } from '../reservation/reservation-provider';
import { OwnerProvider } from '../owner/owner-provider';
import { UserProvider } from '../user/user';

export type SelectedType = 'studio' | 'service' | 'package' | 'owner' | 'reservation';
export type SelectionType =  SelectedType | 'article';
export type Selectable = Studio | Service | Package | Owner | Reservation;

interface SelectionIntent {
  type: SelectionType;
  identifier: string;
  byLink: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UnifiedSingleProvider {
  private readonly serviceProvider = inject(ServiceProvider);
  private readonly studioProvider = inject(StudioProvider);
  private readonly packageProvider = inject(PackageProvider);
  private readonly ownerProvider = inject(OwnerProvider);
  private readonly reservationProvider = inject(ReservationProvider);
  private readonly userProvider = inject(UserProvider);

  private readonly _intent = signal<SelectionIntent | null>(null);

  private readonly _selected = signal<Selectable | undefined>(undefined);
  readonly selected = this._selected.asReadonly();

  readonly hasIntent = computed(() => this._intent() !== null);
  readonly loading = computed(() => this._intent() !== null && this._selected() === undefined );
  readonly activeStudio = computed<Studio | undefined>(() => {
    const selected = this.selected();
    if(!selected) return undefined;

    if(isStudio(selected)) return selected;

    if(isOwner(selected) || isService(selected) || isPackage(selected) || isReservation(selected)){
      if(selected.studio){
        this.studioProvider.ensureStudioLoaded(selected.studio, false);
        return this.studioProvider.getStudioSignal(selected.studio, false)();
      }
    }
    return undefined;
  })
  readonly activeStudioServices = computed<Service[]>(()=>{
    const studio = this.activeStudio();
    if(!studio) return [];
    return studio.services
      ?.map(id => this.serviceProvider.getServiceSignal(id, false)())
      .filter(Boolean) as Service[] ?? []
  })
  readonly activeStudioPackages = computed<Package[]>(()=>{
    const studio = this.activeStudio();
    if(!studio) return [];
    return studio.packages
      ?.map(id => this.packageProvider.getPackageSignal(id, false)())
      .filter(Boolean) as Package[] ?? []
  })
  readonly prerequirement = computed<Service | undefined>(() => {
    const selected = this.selected();
    if(!selected) return undefined;

    if(isService(selected) || isPackage(selected)){
      return selected.prerequiredService
        ? this.serviceProvider.getServiceSignal(selected.prerequiredService, false)()
        : undefined;
    }

    return undefined;
  })
  readonly activeServices = computed<Service[]>(() => {
    const selected = this.selected();
    if(!selected) return [];

    if(isOwner(selected)){
      return this.activeStudioServices();
    }

    if(isStudio(selected) || isPackage(selected)){
      return selected.services
        ?.map(id => this.serviceProvider.getServiceSignal(id, false)())
        .filter(Boolean) as Service[] ?? [];
    }

    if(isReservation(selected)){
      const service = this.serviceProvider.getServiceSignal(selected.service, false)();
      return service? [service] : [];
    }

    if(isService(selected)){
      const self = selected;
      const prereq = this.prerequirement();
      return prereq? [prereq, self] : [self];
    }

    return [];
  })
  readonly activePackages = computed<Package[]>(() => {
    const selected = this.selected();
    if(!selected) return [];

    if(isOwner(selected)){
      return this.activeStudioPackages();
    }

    if(isStudio(selected) || isService(selected)){
      return selected.packages
        ?.map(id => this.packageProvider.getPackageSignal(id, false)())
        .filter(Boolean) as Package[] ?? [];
    }
    
    if(isReservation(selected)){
      const pkg = this.packageProvider.getPackageSignal(selected.package, false)();
      return pkg? [pkg] : [];
    }

    if(isPackage(selected)){
      return [selected];
    }
    return []
  })
  readonly activeOwnerReservations = computed<Reservation[]>(() => {
    const selected = this.selected();
    if(!selected || !isOwner(selected)) return [];
    return this.reservationProvider.reservations();
  })

  select(type: SelectionType, identifier: string, byLink: boolean = false, pushHistory: boolean = true): void {
    const current = this._intent();
    
    if (current && current.type === type && current.identifier === identifier) return;

    if (pushHistory) {
      history.pushState({ type, id: identifier, byLink: byLink }, '', location.href);
    }
    this._selected.set(undefined);
    this._intent.set({ type, identifier, byLink });
  }

  clear(pushHistory: boolean = true): void {
    if(pushHistory){
      history.pushState({ type: 'none' }, '', location.href);
    }
    this._selected.set(undefined);
    this._intent.set(null);
  }

  reload(): void {
    const intent = this._intent();
    const selected = this._selected();

    if (intent) {
      const { type, identifier, byLink } = intent;
      this._intent.set(null);
      this._intent.set({ type, identifier, byLink });
      return;
    }

    if (selected) {
      const type = this.getTypeOfValue(selected);
      if (!type) return;
      
      switch(type){
        case 'studio': this.studioProvider.studiosById.delete(selected.id); break;
        case 'service': this.serviceProvider.servicesById.delete(selected.id); break;
        case 'package': this.packageProvider.packagesById.delete(selected.id); break;
        case 'reservation': this.reservationProvider.reservationsById.delete(selected.id);; break;
        case 'owner': this.ownerProvider.ownersById.delete(selected.id); break;
      }

      this._selected.set(undefined);
      this._intent.set({ type, identifier: selected.id, byLink: false });
    }
  }

  loadById(type: SelectionType, identifier: string): void {
    switch(type){
      case 'studio': this.studioProvider.loadStudiosById([identifier]); break;
      case 'service': this.serviceProvider.loadServicesById([identifier]); break;
      case 'package': this.packageProvider.loadPackagesById([identifier]); break;
      case 'reservation': this.reservationProvider.loadReservationsById([identifier]); break;
      case 'owner': this.ownerProvider.loadOwnersById([identifier]); break;
    }
  }

  clearAll(type: SelectedType): void {
    switch(type){
      case 'studio': this.studioProvider.clearAll(); break;
      case 'service': this.serviceProvider.clearAll(); break;
      case 'package': this.packageProvider.clearAll(); break;
      //case 'reservation': this.reservationProvider.clearAll(); break;
      //case 'owner': this.ownerProvider.clearAll(); break;
    }
  }

  update(value: Selectable){
    const type = this.getTypeOfValue(value);
    if(!type) return;
    switch(type){
      case 'studio': this.studioProvider.update(value as Studio); break;
      case 'service': this.serviceProvider.update(value as Service); break;
      case 'package': this.packageProvider.update(value as Package); break;
      case 'reservation': this.reservationProvider.update(value as Reservation); break;
      case 'owner': this.ownerProvider.update(value as Owner); break;
    }
  }

  constructor() {
    const selection = this.userProvider.lastSelection();
    if(selection.id && selection.type)
      this.select(selection.type, selection.id);

    window.addEventListener('beforeunload', this.saveSelection.bind(this));
    window.addEventListener('popstate', this.onPopState.bind(this));
    this.setupResolutionEffect();
  }

  private saveSelection(){
    const selected = this.selected();
    if(selected){
      const type = this.getType();
      if(!type) return;
      this.userProvider.setSelection(selected.id, type)
    }
  }

  private reservationsTimer: ReturnType<typeof setInterval> | null = null;
  private setupResolutionEffect(): void {
    effect(() => {
      const intent = this._intent();
      if (!intent) return;
      
      const { type, identifier, byLink } = intent;

      let entity: | Studio | Service | Package | Owner | Reservation | undefined;
      switch(type){
        case 'studio':
          entity = this.studioProvider.getStudioSignal(identifier, byLink)();
          if(!entity){
            this.studioProvider.ensureStudioLoaded(identifier, byLink);
          }
        break;
        case 'service':
          entity = this.serviceProvider.getServiceSignal(identifier, byLink)();
          if(!entity){
            this.serviceProvider.ensureServiceLoaded(identifier, byLink);
          }
          break;
        case 'package':
          entity = this.packageProvider.getPackageSignal(identifier, byLink)();
          if(!entity){
            this.packageProvider.ensurePackageLoaded(identifier, byLink);
          }
          break;
        case 'article':
          entity = this.serviceProvider.getServiceSignal(identifier, byLink)();
          if (!entity) {
            this.serviceProvider.ensureServiceLoaded(identifier, byLink);
          }

          if (!entity) {
            entity = this.packageProvider.getPackageSignal(identifier, byLink)();
            if (!entity) {
              this.packageProvider.ensurePackageLoaded(identifier, byLink);
            }
          }
          break;
        case 'owner':
          entity = this.ownerProvider.getOwnerSignal(identifier)();
          if(!entity){
            this.ownerProvider.ensureOwnerLoaded(identifier);
          }
          break;
        case 'reservation':
          entity = this.reservationProvider.getReservationSignal(identifier)();
          if(!entity){
            this.reservationProvider.ensureReservationLoaded(identifier);
          }
          break;
      }

      if(entity){
        this._intent.set(null);
        this._selected.set(entity);

        if (this.reservationsTimer) {
          clearInterval(this.reservationsTimer);
          this.reservationsTimer = null;
        }
        
        if(entity && isOwner(entity)){
          this.reservationProvider.loadStudioReservations();

          this.reservationsTimer = setInterval(() => {
            this.reservationProvider.loadStudioReservations();
          }, 300_000);
        }
      }
    })
  }

  private onPopState(event: PopStateEvent) {
    this.restoreFromHistory(event.state);
  }

  private restoreFromHistory(state: any) {
    if (!state || state.type === 'none') {
      this.clear(false);
      return;
    }
    this.select(state.type, state.id, state.byLink, false);
  }

  private getType(): SelectedType | undefined {
    const selected = this.selected();
    if(!selected) return undefined;
    if(isStudio(selected)) return 'studio';
    if(isOwner(selected)) return 'owner';
    if(isService(selected)) return 'service';
    if(isPackage(selected)) return 'package';
    if(isReservation(selected)) return 'reservation';
    return undefined;
  }

  private getTypeOfValue(value: Selectable): SelectedType | undefined {
    if(!value) return undefined;
    if(isStudio(value)) return 'studio';
    if(isOwner(value)) return 'owner';
    if(isService(value)) return 'service';
    if(isPackage(value)) return 'package';
    if(isReservation(value)) return 'reservation';
    return undefined;
  }

}