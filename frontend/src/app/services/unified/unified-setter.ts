import { inject, Injectable, Injector, runInInjectionContext} from '@angular/core';
import { OwnerSetter } from '../owner/owner-setter';
import { PackageDiff, PackageSetter } from '../package/package-setter';
import { ReservationSetter } from '../reservation/reservation-setter';
import { ServiceDiff, ServiceSetter } from '../service/service-setter';
import { StudioSetter } from '../studio/studio-setter';
import { Category, Discount, EntityWithId, Owner, Package, RequestState, Reservation, ScheduleException, Service, Studio, WeeklySchedule } from '../../models/models';
import { Observable } from 'rxjs';
import { CategoryDiff, CategorySetter } from '../studio/category-setter';
import { ExceptionDiff, ScheduleExceptionsSetter } from '../studio/schedule-exceptions-setter';
import { ScheduleDiff, ScheduleSetter } from '../studio/schedule-setter';
import { DiscountsDiff, DiscountsSetter } from '../studio/discounts-setter';

export interface SetterContract<T extends EntityWithId> {
  create(payload: Omit<T, 'id'>): Observable<RequestState<T>>;
  update(payload: Partial<T> & { id: string }): Observable<RequestState<T>>;
  delete(payload: Partial<T> & { id: string }): Observable<RequestState<T>>;
  updateMany?(payload: unknown): Observable<RequestState<unknown>>;
}

interface ResourceRegistry {
  owner: Owner;
  package: Package;
  reservation: Reservation;
  service: Service;
  studio: Studio;
  category: Category;
  exception: ScheduleException;
  schedule: WeeklySchedule;
  discounts: Discount;
}

export type ResourceKey = keyof ResourceRegistry;

export type Entity<K extends ResourceKey> = ResourceRegistry[K];
type CreatePayload<K extends ResourceKey> = Omit<Entity<K>, 'id'> & { id?: string };
type UpdatePayload<K extends ResourceKey> = Partial<Entity<K>> & { id: string };
type DeletePayload<K extends ResourceKey> = { id: string } & Partial<Entity<K>>;

type SetterMap = {
  [K in ResourceKey]: SetterContract<Entity<K>>;
};

@Injectable({
  providedIn: 'root',
})
export class UnifiedSetter {
  private readonly injector = inject(Injector);
  
  private readonly setters: SetterMap = {
    owner: this.lazyInject(() => inject(OwnerSetter)),
    package: this.lazyInject(() => inject(PackageSetter)),
    reservation: this.lazyInject(() => inject(ReservationSetter)),
    service: this.lazyInject(() => inject(ServiceSetter)),
    studio: this.lazyInject(() => inject(StudioSetter)),
    category: this.lazyInject(() => inject(CategorySetter)),
    exception: this.lazyInject(() => inject(ScheduleExceptionsSetter)),
    schedule: this.lazyInject(() => inject(ScheduleSetter)),
    discounts: this.lazyInject(() => inject(DiscountsSetter))
  };

  create<K extends ResourceKey>(
    resource: K,
    payload: CreatePayload<K>
  ): Observable<RequestState<Entity<K>>> {
    return this.setters[resource].create(payload);
  }

  update<K extends ResourceKey>(
    resource: K,
    payload: UpdatePayload<K>
  ): Observable<RequestState<Entity<K>>> {
    return this.setters[resource].update(payload);
  }

  delete<K extends ResourceKey>(
    resource: K,
    payload: DeletePayload<K>
  ): Observable<RequestState<Entity<K>>> {
    return this.setters[resource].delete(payload);
  }

  private lazyInject<T extends object>(factory: () => T): T {
    let instance: T | undefined;
    
    return new Proxy(Object.create(null), {
      get: (_, prop) => {
        if (!instance) {
          instance = runInInjectionContext(this.injector, factory);
        }
        return (instance as Record<string | symbol, unknown>)[prop];
      },
    }) as T;
  }

  idleState<K extends ResourceKey>(): RequestState<Entity<K>> {
    return { status: 'idle' } as RequestState<Entity<K>>;
  }


  // UpdateMany-s
  updateCategories(diff: CategoryDiff): Observable<RequestState<Category[]>> {
    const setter = this.setters['category'] as CategorySetter;
    return setter.updateMany(diff);
  }
  updateExceptions(diff: ExceptionDiff): Observable<RequestState<ScheduleException[]>> {
    const setter = this.setters['exception'] as ScheduleExceptionsSetter;
    return setter.updateMany(diff);
  }
  updateSchedules(diff: ScheduleDiff): Observable<RequestState<WeeklySchedule[]>> {
    const setter = this.setters['schedule'] as ScheduleSetter;
    return setter.updateMany(diff);
  }

  updatePackages(diff: PackageDiff): Observable<RequestState<Package[]>> {
    const setter = this.setters['package'] as PackageSetter;
    return setter.updateMany(diff);
  }

  updateServices(data: FormData): Observable<RequestState<Service[]>> {
    const setter = this.setters['service'] as ServiceSetter;
    return setter.updateMany(data);
  }

  updateDiscounts(diff: DiscountsDiff): Observable<RequestState<Discount[]>> {
    const setter = this.setters['discounts'] as DiscountsSetter;
    return setter.updateMany(diff);
  }

  updateStudioMedia(data: FormData): Observable<RequestState<Studio>> {
    const setter = this.setters['studio'] as StudioSetter;
    return setter.updateMedia(data);
  }

  resendEmail(resid: string): Observable<RequestState<void>> {
    const setter = this.setters['reservation'] as ReservationSetter;
    return setter.resend(resid);
  }
}