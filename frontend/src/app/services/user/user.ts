import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { Filters, Location, RequestState, timerange, UserIdentity } from '../../models/models';
import { DAY, HOUR } from '../../util/time_constants';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';

export interface LastSelection{
  type?: 'studio' | 'package' | 'service' | 'owner'| 'reservation';
  id?: string,
  timestamp?: number
}

@Injectable({
  providedIn: 'root',
})
export class UserProvider {
  private http = inject(HttpClient);
  private router = inject(Router);
  private readonly STORAGE_KEYS = {
    user: 'app:user',
    filters: 'app:filters',
    lastSelection: 'app:lastSelection',
    token: 'app:authtoken',
    owner_id: 'app:authowner'
  };

  private readonly _user = signal<UserIdentity>({});
  readonly user: Signal<UserIdentity> = this._user.asReadonly();

  private readonly _filters = signal<Filters>({});
  readonly filters: Signal<Filters> = this._filters.asReadonly();
  
  private readonly _lastSelection = signal<LastSelection>({});
  readonly lastSelection: Signal<LastSelection> = this._lastSelection.asReadonly();

  private readonly _authtoken = signal<string | undefined>(undefined);
  readonly authtoken: Signal<string | undefined> = this._authtoken.asReadonly();

  private readonly _owner_id = signal<string | undefined>(undefined);
  readonly owner_id: Signal<string | undefined> = this._owner_id.asReadonly();

  constructor() {
    this.initializeUser();
    this.initializeFilters();
    this.initializeSelection();
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const stored_token = this.read<string>(this.STORAGE_KEYS.token);
    this._authtoken.set(stored_token? stored_token : undefined);
    const stored_owner_id = this.read<string>(this.STORAGE_KEYS.owner_id);
    this._owner_id.set(stored_owner_id? stored_owner_id : undefined);
  }


  private initializeSelection(): void {
    const currentMilli = (new Date()).getMilliseconds();
    const stored = this.read<LastSelection>(this.STORAGE_KEYS.lastSelection);
    if(stored && stored.timestamp && (currentMilli - stored.timestamp) < HOUR){
      this._lastSelection.set(stored);
    }
  }

  testAuth(): Observable<RequestState<Boolean>> {
    const token = this.authtoken();

    if(!token) return of({status: 'success', data: false});
    
    return this.http.get<RequestState<Boolean>>(`/api/authvalidate`);
  }

  isAdmin(): Observable<RequestState<boolean>> {
    const token = this.authtoken();
    if(!token) return of({status: 'success', data: false});
    return this.http.get<RequestState<boolean>>(`api/admin/authvalidate`);
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEYS.token);
    localStorage.removeItem(this.STORAGE_KEYS.owner_id);
    localStorage.removeItem(this.STORAGE_KEYS.lastSelection);
    this._authtoken.set(undefined);
    this._owner_id.set(undefined);
    this._lastSelection.set({});
    this.router.navigate(['']);
  }

  setToken(tkn: string): void {
    this.persist(this.STORAGE_KEYS.token, tkn);
    this._authtoken.set(tkn);
  }

  setOwner(owner: string): void {
    this.persist(this.STORAGE_KEYS.owner_id, owner);
    this._owner_id.set(owner);
  }

  setSelection(id: string, type: 'studio' | 'package' | 'service' | 'owner'| 'reservation'): void {
    const value: LastSelection = {
      id,
      type,
      timestamp: Date.now()
    };

    this.persist(this.STORAGE_KEYS.lastSelection, value);
    this._lastSelection.set(value);
  }

  private initializeUser(): void {
    const stored = this.read<UserIdentity>(this.STORAGE_KEYS.user);
    if (stored) {
      this._user.set(stored);
    }
  }

  setEmail(email: string): void {
    this.updateUser({...this.user(), email});
  }

  setPhone(phone: string): void {
    this.updateUser({...this.user(), phone});
  }

  setLanguage(language: string): void {
    this.updateUser({...this.user(), language});
  }

  private updateUser(user: UserIdentity): void {
    this.persist(this.STORAGE_KEYS.user, user);
    this._user.set(user);
  }

  readonly email = computed<string | undefined>(() => {
    const user = this.user();
    if(!user) return undefined;

    return user.email;
  })

  readonly phone = computed<string | undefined>(() => {
    const user = this.user();
    if(!user) return undefined;

    return user.phone;
  })
  readonly language = computed<string | undefined>(()=> {
    const user = this.user();
    if(!user) return undefined;
    return user.language;
  })

  private initializeFilters(): void {
    const currentMilli = (new Date()).getMilliseconds();
    const stored = this.read<Filters>(this.STORAGE_KEYS.filters);
    if(stored && stored.timestamp && (currentMilli - stored.timestamp) < DAY){
      this._filters.set(stored);
    }
  }

  setSearch(search: string): void {
    this.updateFilters({ search });
  }

  setStudioType(studioType: string): void {
    this.updateFilters({ studioType });
  }

  setServiceType(serviceType: string): void {
    this.updateFilters({ serviceType });
  }

  setLocation(location: Location): void {
    this.updateFilters({ location });
  }

  setTimeslot(timeslot: timerange): void {
    this.updateFilters({ timeslot });
  }

  clearSearch(): void {
    this.updateFilters({ search: undefined });
  }
  clearStudioType(): void {
    this.updateFilters({ studioType: undefined });
  }
  clearServiceType(): void {
    this.updateFilters({ serviceType: undefined });
  }
  clearLocation(): void {
    this.updateFilters({ location: undefined });
  }
  clearTimeslot(): void {
    this.updateFilters({ timeslot: undefined });

  }

  private updateFilters(partial: Partial<Filters>): void {
    const updated: Filters = {
      ...this.filters(),
      ...partial,
      timestamp: Date.now()
    };

    this.persist(this.STORAGE_KEYS.filters, updated);
    this._filters.set(updated);
  }

  // =====================================================
  // Storage helpers
  // =====================================================

  private persist<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private read<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
}