import { HttpClient } from '@angular/common/http';
import { APP_INITIALIZER, inject, Injectable, provideAppInitializer, signal, Signal } from '@angular/core';
import { firstValueFrom, map, tap } from 'rxjs';
import { Location } from '../../models/models';

@Injectable({
  providedIn: 'root',
})
export class LocationProvider {
  private readonly http = inject(HttpClient);

  private readonly _locations = signal<Location[]>([]);
  readonly locations: Signal<Location[]> = this._locations.asReadonly();

  private initialized = false;
  init(): Promise<void> {
    return firstValueFrom(
      this.http.get<Location[]>('https://locations.spletka.com/locations.v1.json').pipe(
        tap((locations) => {
          this._locations.set(locations);
        }),
        map(() => void 0)
      )
    ).catch((error) => {
      console.error('[LocationProvider] failed to load locations', error);
      return Promise.resolve();
    });
  }
}

export function provideLocationsInitializer() {
  return provideAppInitializer(()=>{
    const location = inject(LocationProvider);
    return location.init();
  })
}