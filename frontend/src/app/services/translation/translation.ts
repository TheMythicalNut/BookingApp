import { APP_INITIALIZER, computed, effect, inject, Injectable, provideAppInitializer, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { RESERVATION_STATUSES, SERVICE_TYPES, STUDIO_TYPES } from '../../CONST';
import { UserProvider } from '../user/user';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private readonly http = inject(HttpClient);
  private readonly user = inject(UserProvider);
  
  readonly supported = ["en", "sr", "sl", "ro", "bg", "hr", "bs", "mk", "sq"];

  readonly userLang = computed<string>(()=>{  // 1. user set language => 2. browser set language => 3. default to english
    const userLanguage = this.user.language();
    if(userLanguage){
      if(this.supported.includes(userLanguage)) return userLanguage;
      else return this.getNormalizedLanguage();
    }
    return this.getNormalizedLanguage();
  });

  private translations: any = {};

  readonly weekDays = signal(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  readonly monthNames = signal([ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
  readonly shortMonthNames = signal([ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

  getNormalizedLanguage(): string {
    const languages = navigator.languages ?? [navigator.language];

    for (const lang of languages) {
      const base = lang.split("-")[0].toLowerCase();
      if (this.supported.includes(base)) {
        return base;
      }
    }
    return "en"; // default
  }

  // Load JSON for a language
  loadLanguage(lang: string, reload: boolean = false) {
    if(!this.supported.includes(lang)) return;

    this.loadLanguageObservable(lang, reload).subscribe();
  }

  loadLanguageObservable(lang: string, reload: boolean = false): Observable<void> {
    return this.http.get(`/assets/i18n/${lang}.json`).pipe(
      map((res: any) => {
        this.translations = res;
        this.user.setLanguage(lang);
        this.serviceTypeNames.clear();
        this.studioTypeNames.clear();
        this.reservationStatusNames.clear();
        this.updateMonthNames();
        this.updateWeekDays();
        if(reload)
          window.location.reload();
      })
    );
  }

  // Retrieve translation for a key like 'BUTTON.SAVE'
  translate<T = string>(key: string, params?: Record<string, string>): T {
  const keys = key.split('.');
  let value: any = this.translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key as unknown as T; // safe fallback
    }
  }

  if (typeof value === 'string' && params) {
    for (const p in params) {
      value = value.replace(`{{${p}}}`, params[p]);
    }
  }

  return value as T;
}

  // Switch language dynamically
  switchLanguage(lang: string) {
    this.loadLanguage(lang);
  }

  private readonly serviceTypeNames = new Map<string, string>();
  private readonly studioTypeNames = new Map<string, string>();
  private readonly reservationStatusNames = new Map<string, string>();

  getServiceTypeName(type: string[], joiner: string = '\n'): string {
    //return this.translate(SERVICE_TYPES[type[0]]);
    const names: string[] = []
    for(const t of type){
      if(this.serviceTypeNames.has(t)){
        names.push(this.serviceTypeNames.get(t)!);
      } else {
        const name = this.translate(SERVICE_TYPES[t])
        this.serviceTypeNames.set(t, name);
        names.push(name);
      }
    }
    return names.join(joiner);
  }
  getStudioTypeName(type: string[], joiner: string = '\n'): string {
    //return this.translate(STUDIO_TYPES[type[0]]);
    const names: string[] = []
    for(const t of type){
      if(this.studioTypeNames.has(t)){
        names.push(this.studioTypeNames.get(t)!);
      } else {
        const name = this.translate(STUDIO_TYPES[t])
        this.studioTypeNames.set(t, name);
        names.push(name);
      }
    }
    // STUDIO_TYPE.MANICURIST
    return names.join(joiner);
  }

  getReservationStatusName(status: string): string {
    if(this.reservationStatusNames.has(status)){
      return this.reservationStatusNames.get(status)!; 
    } else {
      const name = this.translate(RESERVATION_STATUSES[status]);
      this.reservationStatusNames.set(status, name);
      return name;
    }
  }

  private updateWeekDays(){
    this.weekDays.set([
      this.translate('DATE.SUN'),
      this.translate('DATE.MON'),
      this.translate('DATE.TUE'),
      this.translate('DATE.WED'),
      this.translate('DATE.THU'),
      this.translate('DATE.FRI'),
      this.translate('DATE.SAT'),
    ])
  }
  private updateMonthNames(){
    this.monthNames.set([
      this.translate('DATE.JANUARY'),
      this.translate('DATE.FEBRUARY'),
      this.translate('DATE.MARCH'),
      this.translate('DATE.APRIL'),
      this.translate('DATE.MAY'),
      this.translate('DATE.JUNE'),
      this.translate('DATE.JULY'),
      this.translate('DATE.AUGUST'),
      this.translate('DATE.SEPTEMBER'),
      this.translate('DATE.OCTOBER'),
      this.translate('DATE.NOVEMBER'),
      this.translate('DATE.DECEMBER')
    ]);
    this.shortMonthNames.set([
      this.translate('DATE.JAN'),
      this.translate('DATE.FEB'),
      this.translate('DATE.MAR'),
      this.translate('DATE.APR'),
      this.translate('DATE.MAY'),
      this.translate('DATE.JUN'),
      this.translate('DATE.JUL'),
      this.translate('DATE.AUG'),
      this.translate('DATE.SEP'),
      this.translate('DATE.OCT'),
      this.translate('DATE.NOV'),
      this.translate('DATE.DEC')      
    ])
  }

}

export function provideTranslationInitializer() {
  return provideAppInitializer(()=>{
    const translate = inject(TranslationService);
    // Return either an Observable or Promise; Angular will wait for it
    return translate.loadLanguageObservable(translate.userLang());

  })
}