import { computed, effect, inject, Injectable, provideAppInitializer, signal, untracked } from '@angular/core';
import { UserProvider } from '../user/user';
import {
  LoadPackageOptions,
  LoadServiceOptions,
  LoadStudioOptions,
} from '../../models/models';
import { UnifiedListProvider } from '../unified/unified-list-provider';
import { ServiceProvider } from '../service/service-provider';
import { StudioProvider } from '../studio/studio-provider';
import { PackageProvider } from '../package/package-provider';

export const BATCH_SIZE = 20;

@Injectable({
  providedIn: 'root',
})
export class HydrationProvider {
  private readonly serviceProvider = inject(ServiceProvider);
  private readonly studioProvider = inject(StudioProvider);
  private readonly packageProvider = inject(PackageProvider);
  private readonly listProvider = inject(UnifiedListProvider);
  private readonly userProvider = inject(UserProvider);


  // ─────────────────────────────────────────────
  // Public signals
  // ─────────────────────────────────────────────

  /**
   * True when no load operation is currently in flight.
   * Use this to gate calls to `hydrateMore()` in scroll handlers.
   */
  readonly canHydrate = computed(() => !this.listProvider.loading());

  constructor() {
    this.setupFilterEffect();
  }

  init(): void {
    this.hydrate();
  }

  // ─────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────

  /**
   * Primary hydration entry point.
   *
   * Reads current filters and already-loaded entries, then fires
   * `loadServices`, `loadPackages`, and `loadStudios` with:
   * - `exclude` populated from the relevant tracked-ID sets
   * - a fresh random seed on every call (for backend shuffle)
   * - filter fields forwarded from `UserProvider.filters()`
   */
  hydrate(): void {
    const filters = this.userProvider.filters();
    const seed = Math.floor(Math.random() * 1_000_000);

    const loadedServiceIds = Array.from(this.serviceProvider.servicesById.keys());
    const loadedPackageIds = Array.from(this.packageProvider.packagesById.keys());
    const loadedStudioIds = Array.from(this.studioProvider.studiosById.keys());

    const serviceOptions: LoadServiceOptions & { seed: number } = {
      include: [],
      exclude: Array.from(loadedServiceIds),
      amount: BATCH_SIZE,
      ...(filters.location   && { location:    filters.location }),
      ...(filters.timeslot   && { timeslot:    filters.timeslot }),
      ...(filters.serviceType && { serviceType: filters.serviceType }),
      seed,
    };

    const packageOptions: LoadPackageOptions & { seed: number } = {
      include: [],
      exclude: Array.from(loadedPackageIds),
      amount: BATCH_SIZE,
      ...(filters.location    && { location:    filters.location }),
      ...(filters.timeslot    && { timeslot:    filters.timeslot }),
      ...(filters.serviceType && { serviceType: filters.serviceType }),
      seed,
    };

    const studioOptions: LoadStudioOptions & { seed: number } = {
      include: [],
      exclude: Array.from(loadedStudioIds),
      amount: BATCH_SIZE,
      ...(filters.search     && { search:     filters.search }),
      ...(filters.studioType && { studioType: filters.studioType }),
      seed,
    };

    this.listProvider.loadServices(serviceOptions);
    this.listProvider.loadPackages(packageOptions);
    this.listProvider.loadStudios(studioOptions);
  }


  /**
   * Convenience method for infinite-scroll / "load more" triggers.
   *
   * Guards against overlapping requests by checking `canHydrate`.
   * Does NOT reset tracked IDs, so `exclude` keeps growing and
   * previously fetched items are never re-requested.
   */
  hydrateMore(): void {
    if (!this.canHydrate()) return;
    this.hydrate();
  }

  /**
   * Watches `UserProvider.filters()` and re-hydrates
   * whenever filters change, ensuring stale results are discarded.
   */
  private setupFilterEffect(): void {
    effect(() => {
      this.userProvider.filters();

      untracked(()=>{
        this.hydrate();
      })
    });
  }
}

export function provideHydrationProviderInitializer() {
  return provideAppInitializer(()=>{
    const hydration = inject(HydrationProvider);
    hydration.init();
  })
}