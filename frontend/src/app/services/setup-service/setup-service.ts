import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, ValidationErrors, Validator, Validators } from '@angular/forms';
import { distinctUntilChanged, map, Observable, of, shareReplay, startWith } from 'rxjs';
import { UnifiedSingleProvider } from '../unified/unified-single-provider';
import { Category, Discount, isOwner, Package, RequestState, ScheduleException, Service, Studio, WeeklySchedule } from '../../models/models';
import { toYYYY_MM_DD } from '../../util/studio_days';
import { deepEqual, hasNoOverlapsIntervals, hasUniqueArticleTargets, hasUniqueCategoryNames, hasUniquePackageLinks, hasUniqueServiceLinks, hasUniqueStrings, isBetween, isValidAppliesTo, isValidEmail, isValidExceptionType, isValidFacebookLink, isValidImage, isValidInstagramLink, isValidPhone, isValidPrice, isValidTime, isValidTimestampedImage, isWhitespace, nonEmpty } from '../../util/email_validator';
import { Entity, ResourceKey, UnifiedSetter } from '../unified/unified-setter';
import { COUNTRY_CURRENCY, COUNTRY_TIME_ZONE, DAY_OF_WEEK } from '../../CONST';
import { ExceptionDiff } from '../studio/schedule-exceptions-setter';
import { ScheduleDiff } from '../studio/schedule-setter';
import { PackageDiff } from '../package/package-setter';
import { ServiceDiff } from '../service/service-setter';
import { DiscountsDiff } from '../studio/discounts-setter';

type SetupStepState = 'empty' | 'modified' | 'invalid' | 'selected';

class StepController<TValue, TForm extends FormGroup | FormArray> {
  readonly form: TForm;

  private readonly savedState;
  readonly value$;
  readonly status$;

  private readonly valueSig;
  private readonly statusSig;

  readonly isValid;
  readonly hasUnsavedChangesSig;
  readonly setupStepState;
  readonly isFilledOut;

  constructor(
    form: TForm,
    private readonly filledEvaluator?: (value: TValue) => boolean
  ) {
    this.form = form;

    // Baseline snapshot (source of truth for "empty")
    this.savedState = signal<TValue>(this.form.getRawValue());

    // Always emit raw value
    this.value$ = this.form.valueChanges.pipe(
      map(() => this.form.getRawValue() as TValue),
      distinctUntilChanged((a, b) => deepEqual(a, b)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    // Angular status is the single source of truth for validity
    this.status$ = this.form.statusChanges.pipe(
      startWith(this.form.status),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.valueSig = toSignal(this.value$, {
      initialValue: this.form.getRawValue()
    });

    this.statusSig = toSignal(this.status$, {
      initialValue: this.form.status
    });

    this.isValid = computed(() => this.statusSig() === 'VALID');

    // Modification = deep comparison against saved snapshot
    this.hasUnsavedChangesSig = computed(() =>
      !deepEqual(this.savedState(), this.valueSig())
    );

    // Strict state contract:
    // - not modified -> 'empty'
    // - modified + invalid -> 'invalid'
    // - modified + valid -> 'modified'
    this.setupStepState = computed<SetupStepState>(() => {
      const modified = this.hasUnsavedChangesSig();
      if (!modified) return 'empty';

      return this.isFilledOut() ? 'modified' : 'invalid';
    });

    this.isFilledOut = computed(() => {
      if (!this.filledEvaluator) return this.isValid();
      return this.filledEvaluator(this.valueSig());
    });
  }

  hasUnsavedChanges(): boolean {
    return this.hasUnsavedChangesSig();
  }

  markAsSaved(): void {
    this.savedState.set(this.form.getRawValue());
    this.form.markAsPristine();
  }

  reset(): void {
    this.form.reset(this.savedState());
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}


type HeroImageForm = FormGroup<{
  id: FormControl<string>;
  key: FormControl<string>;
  url: FormControl<string>;
  file: FormControl<File | null>;
}>;

type IntervalForm = FormGroup<{
  start: FormControl<string>;
  end: FormControl<string>;
}>;

type DayForm = FormGroup<{
  day: FormControl<string>;
  open: FormControl<boolean>;
  intervals: FormArray<IntervalForm>;
}>;

type ScheduleForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  effectiveFrom: FormControl<string | null>;
  effectiveTo: FormControl<string | null>;
  days: FormArray<DayForm>;
}>;

type OneOffDate = FormGroup<{ 
  date: FormControl<string>; // ISO-8601 date (YYYY-MM-DD) 
}> 

type DateRange = FormGroup<{ 
  startDate: FormControl<string>; // ISO-8601 date (YYYY-MM-DD) 
  endDate: FormControl<string>; // ISO-8601 date (YYYY-MM-DD), inclusive 
}> 
type AnnualRecurringDate = FormGroup<{ 
  month: FormControl<number>; // 1-12 
  day: FormControl<number>; // 1-31 
}>

type OneOffExceptionForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  label: FormControl<string>;
  type: FormControl<"oneOff">;
  appliesTo: OneOffDate;
  isClosed: FormControl<boolean>;
  intervals: FormArray<IntervalForm>;
}>;

type RangeExceptionForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  label: FormControl<string>;
  type: FormControl<"range">;
  appliesTo: DateRange;
  isClosed: FormControl<boolean>;
  intervals: FormArray<IntervalForm>;
}>;

type AnnualExceptionForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  label: FormControl<string>;
  type: FormControl<"annual">;
  appliesTo: AnnualRecurringDate;
  isClosed: FormControl<boolean>;
  intervals: FormArray<IntervalForm>;
}>;

type ExceptionForm =
  | OneOffExceptionForm
  | RangeExceptionForm
  | AnnualExceptionForm;


type CategoryForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  name: FormControl<string>;
}>;

type GalleryImageForm = FormGroup<{
  id: FormControl<string>;
  key: FormControl<string>;
  url: FormControl<string>;
  file: FormControl<File | null>;
  timestamp: FormControl<number>;
}>;

type ServiceForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  name: FormControl<string>;
  link: FormControl<string>;
  category: FormControl<string>;
  type: FormControl<string[]>;
  price: FormControl<string>;
  currency: FormControl<string>;
  duration: FormControl<number | undefined>;
  prerequiredService: FormControl<string | null>;
  description: FormControl<string>;
  thumbnail: HeroImageForm;
  gallery: FormArray<GalleryImageForm>;
}>;

type PackageForm = FormGroup<{
  localID: FormControl<string>;
  id: FormControl<string>;
  name: FormControl<string>;
  link: FormControl<string>;
  price: FormControl<string>;
  currency: FormControl<string>;
  duration: FormControl<number | undefined>;
  services: FormControl<string[]>;
  description: FormControl<string>;
}>;

type DiscountForm = FormGroup<{
  localID: FormControl<string>;
  article: FormControl<{id: string, type: 'service' | 'package'}>;
  percentage: FormControl<number | undefined>;
}>;

@Injectable({
  providedIn: 'root',
})
export class SetupService {
  private readonly singleProvider = inject(UnifiedSingleProvider);
  private readonly setter = inject(UnifiedSetter);
  private readonly fb = inject(NonNullableFormBuilder);

  /* ---------------- Profile ---------------- */

  private readonly profileForm = this.fb.group({
    studioName: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(3)]
    }),
    studioLink: this.fb.control('', {
      validators: [Validators.required, Validators.minLength(3)]
    }),
    studioTypes: this.fb.control<string[]>([], { 
      validators: [Validators.required, Validators.minLength(1)] 
    }),
    contactEmail: this.fb.control('', {
      validators: [Validators.required, Validators.email]
    }),
    contactPhone: this.fb.control('', {
      validators: [Validators.required]
    }),
    instagram: this.fb.control(''),
    facebook: this.fb.control(''),
    whatsappPhone: this.fb.control(''),
    searchTags: this.fb.control<string[]>([])
  }, { validators: [this.profileValidator]});
  
  private profileValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value as {
      studioName: string;
      studioLink: string;
      studioTypes: string[];
      instagram: string;
      facebook: string;
      contactEmail: string;
      contactPhone: string;
      whatsappPhone: string;
    };

    let errors: any = {}
    if (!v) errors = { ...errors, invalidProfile: true };

    if (!nonEmpty(v.studioName)) errors = { ...errors, missingStudioName: true };
    if (nonEmpty(v.studioName) && v.studioName.length < 3) errors = { ...errors, tooShortStudioName: true };
    if (!nonEmpty(v.studioLink)) errors = { ...errors, missingStudioLink: true };
    if (nonEmpty(v.studioLink) && v.studioLink.length < 3) errors = { ...errors, tooShortStudioLink: true };
    if (!v.studioTypes || v.studioTypes.length < 1) errors = { ...errors, missingStudioTypes: true };
    if (!nonEmpty(v.contactEmail)) errors = { ...errors, missingContactEmail: true };
    if (nonEmpty(v.contactEmail) && !isValidEmail(v.contactEmail)) errors = { ...errors, invalidContactEmail: true };
    if (!nonEmpty(v.contactPhone)) errors = { ...errors, missingContactPhone: true };
    if (nonEmpty(v.contactPhone) && !isValidPhone(v.contactPhone)) errors = { ...errors, invalidContactPhone: true };
    if (!!v.instagram && !isWhitespace(v.instagram) && !isValidInstagramLink(v.instagram)) errors = { ...errors, invalidInstagram: true };
    if (!!v.facebook && !isWhitespace(v.facebook) && !isValidFacebookLink(v.facebook)) errors = { ...errors, invalidFacebook: true };
    if (!!v.whatsappPhone && !isWhitespace(v.whatsappPhone) && !isValidPhone(v.whatsappPhone)) errors = { ...errors, invalidWhatsappPhone: true };

    return !!errors ? errors : null;
  }

  readonly profileStep = new StepController(
    this.profileForm, 
    (v: { 
      studioName: string;
      studioLink: string;
      studioTypes: string[]; 
      instagram: string; 
      facebook: string; 
      contactEmail: string; 
      contactPhone: string; 
      whatsappPhone: string; 
    }) =>
      !!v &&
      nonEmpty(v.studioName) && v.studioName.length >= 3 &&
      nonEmpty(v.studioLink) && v.studioLink.length >= 3 &&
      (v.studioTypes && v.studioTypes.length >= 1) &&
      (!(!!v.instagram) || isWhitespace(v.instagram) || isValidInstagramLink(v.instagram)) &&
      (!(!!v.facebook) || isWhitespace(v.facebook) || isValidFacebookLink(v.facebook)) &&
      nonEmpty(v.contactEmail) && isValidEmail(v.contactEmail) &&
      nonEmpty(v.contactPhone) && isValidPhone(v.contactPhone) &&
      (!(!!v.whatsappPhone) || isWhitespace(v.whatsappPhone) || isValidPhone(v.whatsappPhone))
  );

  /* ---------------- Location ---------------- */

  private readonly locationForm = this.fb.group({
    country: this.fb.control('', Validators.required),
    city: this.fb.control('', Validators.required),
    street: this.fb.control('', Validators.required),
    buildingNumber: this.fb.control('', Validators.required),
    apartmentNumber: this.fb.control('', Validators.required),
    longitude: this.fb.control<number | undefined>(undefined, { validators: [Validators.required, Validators.min(-180), Validators.max(180)] }),
    latitude: this.fb.control<number | undefined>(undefined, { validators: [Validators.required, Validators.min(-90), Validators.max(90)] })
  }, {validators: [this.locationValidator]});
  
  private locationValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value as {
      country: string;
      city: string;
      street: string;
      buildingNumber: string;
      apartmentNumber: string;
      longitude: number;
      latitude: number;
    };


    let errors: any = {}

    if (!v) errors = { ...errors, invalidLocation: true };
    if (!nonEmpty(v.country)) errors = { ...errors, missingCountry: true };
    if (!nonEmpty(v.city)) errors = { ...errors, missingCity: true };
    if (!nonEmpty(v.street)) errors = { ...errors, missingStreet: true };
    if (!nonEmpty(v.buildingNumber)) errors = { ...errors, missingBuildingNumber: true };
    if (!nonEmpty(v.apartmentNumber)) errors = { ...errors, missingApartmentNumber: true };
    if (!v.latitude || !Number.isFinite(v.latitude)) errors = { ...errors, missingLatitude: true };
    else if (!isBetween(v.latitude, -90, 90)) errors = { ...errors, invalidLatitude: true };
    if (!v.longitude || !Number.isFinite(v.longitude)) errors = { ...errors, missingLongitude: true };
    else if (!isBetween(v.longitude, -180, 180)) errors = { ...errors, invalidLongitude: true };

    return !!errors ? errors : null;
  }
  readonly locationStep = new StepController(
    this.locationForm,
    (v: {
      country: string;
      city: string;
      street: string;
      buildingNumber: string;
      apartmentNumber: string;
      longitude: number;
      latitude: number;
    }) => 
      !!v &&
      nonEmpty(v.country) &&
      nonEmpty(v.city) &&
      nonEmpty(v.street) &&
      nonEmpty(v.buildingNumber) &&
      nonEmpty(v.apartmentNumber) &&
      isBetween(v.latitude, -90, 90) &&
      isBetween(v.longitude, -180, 180)
  );

  /* ---------------- Media ---------------- */

  private readonly mediaForm = this.fb.group({
    thumbnail: this.fb.group({
      url: this.fb.control<string>('', Validators.required),
      file: this.fb.control<File | null>(null, Validators.required),
    }),
    heroImages: this.fb.array<HeroImageForm>( [], { validators: [Validators.minLength(1), Validators.maxLength(3)] })
  }, {validators: [this.mediaValidator]});
  
  private mediaValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value as {
      thumbnail: {
        url: string;
        file: File | null;
      };
      heroImages: {
        url: string;
        file: File | null;
      }[];
    };

    let errors: any = {}

    if (!v) errors = { ...errors, invalidMedia: true };
    if (!isValidImage(v.thumbnail)) errors = { ...errors, missingThumbnail: true };
    if (!Array.isArray(v.heroImages) || !isBetween(v.heroImages.length, 1, 3)) errors = { ...errors, invalidHeroImagesCount: true };
    if (!v.heroImages.every(isValidImage)) errors = { ...errors, invalidHeroImage: true };

    return !!errors ? errors : null;
  }

  readonly mediaStep = new StepController(
    this.mediaForm,
    (v: {
      thumbnail: {
        url: string;
        file: File | null;
      };
      heroImages: {
        url: string;
        file: File | null;
      }[];
    }) =>
      !!v &&
      isValidImage(v.thumbnail) &&
      Array.isArray(v.heroImages) &&
      isBetween(v.heroImages.length, 1, 3) &&
      v.heroImages.every(img =>
        isValidImage(img)
      )
  );

  /* ---------------- Schedule ---------------- */

  private createInterval(): IntervalForm {
    return this.fb.group({
      start: this.fb.control('09:00', Validators.required),
      end: this.fb.control('17:00', Validators.required)
    });
  }

  private createDay(day: string): DayForm {
    return this.fb.group({
      day: this.fb.control(day),
      open: this.fb.control(false),
      intervals: this.fb.array<IntervalForm>(
        [ this.createInterval() ]
      )
    });
  }

  private generateWeek(): DayForm[] {
    const days = [
      'DATE.SUNDAY',
      'DATE.MONDAY',
      'DATE.TUESDAY',
      'DATE.WEDNESDAY',
      'DATE.THURSDAY',
      'DATE.FRIDAY',
      'DATE.SATURDAY'
    ];
    return days.map(d => this.createDay(d));
  }

  private readonly scheduleForm = 
  new FormGroup<{
    schedules: FormArray<ScheduleForm>;
  }>({
    schedules: new FormArray<ScheduleForm>([
      this.fb.group({
        localID: this.fb.control<string>(crypto.randomUUID()),
        id: this.fb.control<string>(''),
        days: this.fb.array<DayForm>(this.generateWeek()),
        effectiveFrom: this.fb.control<string | null>(null),
        effectiveTo: this.fb.control<string | null>(null),
      }, {validators: [this.scheduleValidator]})
    ]),
  }, { validators: [ this.scheduleArrayValidator ]});
  
private scheduleValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as {
    effectiveFrom: string | null;
    effectiveTo: string | null;
    days: {
      day: string;
      open: boolean;
      intervals: { start: string; end: string }[];
    }[];
  };

  if (!v) return { invalidSchedule: true };
  if (!Array.isArray(v.days) || v.days.length !== 7) return { invalidDaysAmount: true };

  const dayErrors: (ValidationErrors | null)[] = new Array(7).fill(null);

  for (let i = 0; i < v.days.length; i++) {
    const d = v.days[i];
    let dErrors: ValidationErrors = {};

    if (!d) { dayErrors[i] = { invalidDay: true }; continue; }
    if (!nonEmpty(d.day)) dErrors = { ...dErrors, missingDayName: true };
    if (!Array.isArray(d.intervals)) { dayErrors[i] = { ...dErrors, invalidIntervals: true }; continue; }

    if (!d.open) continue;

    if (d.intervals.length === 0) { dayErrors[i] = { ...dErrors, missingIntervals: true }; continue; }

    const intervalErrors: (ValidationErrors | null)[] = new Array(d.intervals.length).fill(null);

    for (let j = 0; j < d.intervals.length; j++) {
      const interval = d.intervals[j];
      let iErrors: ValidationErrors = {};

      if (!interval) { intervalErrors[j] = { invalidInterval: true }; continue; }
      if (!nonEmpty(interval.start) || !isValidTime(interval.start)) iErrors = { ...iErrors, invalidIntervalStart: true };
      if (!nonEmpty(interval.end) || !isValidTime(interval.end)) iErrors = { ...iErrors, invalidIntervalEnd: true };
      if (!iErrors['invalidIntervalStart'] && !iErrors['invalidIntervalEnd']) {
        if (interval.start >= interval.end) iErrors = { ...iErrors, invalidIntervalRange: true };
      }

      if (Object.keys(iErrors).length > 0) intervalErrors[j] = iErrors;
    }

    if (!hasNoOverlapsIntervals(d.intervals)) dErrors = { ...dErrors, overlappingIntervals: true };

    const hasIntervalErrors = intervalErrors.some(e => e !== null);
    if (hasIntervalErrors) dErrors = { ...dErrors, intervals: intervalErrors };

    if (Object.keys(dErrors).length > 0) dayErrors[i] = dErrors;
  }

  const hasDayErrors = dayErrors.some(e => e !== null);
  return hasDayErrors ? { days: dayErrors } : null;
}
/* --------------------------------
 * SCHEDULE ARRAY ERROR STRUCTURE
 ----------------------------------- */
// 0. { invalidSchedulesArray: true }
// 1. { missingSchedules: true }
// 2. { emptySchedules: true }
// 3. {
//      schedules: [
//        null,                                          // schedule 0 (base) — no date validation
//        {                                              // schedule 1+
//          missingEffectiveFrom: true,
//          missingEffectiveTo: true,
//          effectiveFromInvalidFormat: true,
//          effectiveToInvalidFormat: true,
//          effectiveRangeInvalid: true,                // effectiveTo <= effectiveFrom
//        },
//        null,
//      ]
//    }
private scheduleArrayValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as {
    schedules: {
      effectiveFrom: string | null;
      effectiveTo: string | null;
    }[];
  } | null;

  if (!v || typeof v !== 'object') return { invalidSchedulesArray: true };
  if (!Array.isArray(v.schedules)) return { missingSchedules: true };
  if (v.schedules.length === 0) return { emptySchedules: true };

  const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

  const scheduleErrors: (ValidationErrors | null)[] = v.schedules.map((s, i) => {
    // First schedule: effectiveFrom/To are intentionally null — skip date validation
    if (i === 0) return null;

    let sErrors: ValidationErrors = {};
    const from = s?.effectiveFrom;
    const to = s?.effectiveTo;

    if (!nonEmpty(from)) {
      sErrors = { ...sErrors, missingEffectiveFrom: true };
    } else if (!isValidDate(from!)) {
      sErrors = { ...sErrors, effectiveFromInvalidFormat: true };
    }

    if (!nonEmpty(to)) {
      sErrors = { ...sErrors, missingEffectiveTo: true };
    } else if (!isValidDate(to!)) {
      sErrors = { ...sErrors, effectiveToInvalidFormat: true };
    }

    if (
      !sErrors['missingEffectiveFrom'] && !sErrors['effectiveFromInvalidFormat'] &&
      !sErrors['missingEffectiveTo'] && !sErrors['effectiveToInvalidFormat']
    ) {
      if (to! <= from!) sErrors = { ...sErrors, effectiveRangeInvalid: true };
    }

    return Object.keys(sErrors).length > 0 ? sErrors : null;
  });

  const hasScheduleErrors = scheduleErrors.some(e => e !== null);
  return hasScheduleErrors ? { schedules: scheduleErrors } : null;
}


private isValidSchedule(s: {
  effectiveFrom: string | null;
  effectiveTo: string | null;
  days: {
    day: string;
    open: boolean;
    intervals: { start: string; end: string }[];
  }[];
}, isFirst: boolean): boolean {
  const isValidDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

  const datesValid = isFirst
    ? true
    : nonEmpty(s.effectiveFrom) && isValidDate(s.effectiveFrom!) &&
      nonEmpty(s.effectiveTo) && isValidDate(s.effectiveTo!) &&
      s.effectiveTo! > s.effectiveFrom!;

  const daysValid =
    !!s &&
    Array.isArray(s.days) &&
    s.days.length === 7 &&
    s.days.every(d =>
      !!d &&
      nonEmpty(d.day) &&
      Array.isArray(d.intervals) &&
      (
        !d.open
          ? true
          : d.intervals.length > 0 &&
            d.intervals.every(i =>
              !!i &&
              nonEmpty(i.start) &&
              nonEmpty(i.end) &&
              isValidTime(i.start) &&
              isValidTime(i.end) &&
              i.start < i.end
            ) &&
            hasNoOverlapsIntervals(d.intervals)
      )
    );

  return datesValid && daysValid;
}

readonly scheduleStep = new StepController(
  this.scheduleForm,
  (v: {
    schedules: {
      effectiveFrom: string | null;
      effectiveTo: string | null;
      days: {
        day: string;
        open: boolean;
        intervals: { start: string; end: string }[];
      }[];
    }[];
  }) =>
    !!v &&
    Array.isArray(v.schedules) &&
    v.schedules.length > 0 &&
    v.schedules.every((s, i) => this.isValidSchedule(s, i === 0))
);

  /* ---------------- Exceptions ---------------- */

  private readonly exceptionsForm =
    new FormGroup<{
      exceptions: FormArray<ExceptionForm>;
    }>({
      exceptions: new FormArray<ExceptionForm>([]),
    }, {validators: [this.exceptionsValidator]});
  
  private exceptionsValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value as {
      exceptions: {
        label: string;
        type: "oneOff" | "range" | "annual";
        appliesTo: any;
        isClosed: boolean;
        intervals: { start: string; end: string }[];
      }[];
    };

    if (!v) return { invalidExceptions: true };
    if (!Array.isArray(v.exceptions)) return { invalidExceptionsArray: true };

    const exceptionErrors: (ValidationErrors | null)[] =
      new Array(v.exceptions.length).fill(null);

    for (let i = 0; i < v.exceptions.length; i++) {
      const e = v.exceptions[i];
      let eErrors: ValidationErrors = {};

      if (!e) {
        exceptionErrors[i] = { invalidException: true };
        continue;
      }

      if (!isValidExceptionType(e)) {
        eErrors = { ...eErrors, invalidExceptionType: true };
      }

      if (!isValidAppliesTo(e)) {
        eErrors = { ...eErrors, invalidAppliesTo: true };
      }

      const intervalsIsArray = Array.isArray(e.intervals);

      if (!intervalsIsArray) {
        eErrors = { ...eErrors, invalidIntervals: true };
      }

      if (intervalsIsArray && !e.isClosed) {
        const intervals = e.intervals;

        if (intervals.length === 0) {
          eErrors = { ...eErrors, missingIntervals: true };
        }

        const intervalErrors: (ValidationErrors | null)[] =
          new Array(intervals.length).fill(null);

        for (let j = 0; j < intervals.length; j++) {
          const interval = intervals[j];
          let iErrors: ValidationErrors = {};

          if (!interval) {
            iErrors = { ...iErrors, invalidInterval: true };
          } else {
            if (!nonEmpty(interval.start) || !isValidTime(interval.start)) {
              iErrors = { ...iErrors, invalidIntervalStart: true };
            }

            if (!nonEmpty(interval.end) || !isValidTime(interval.end)) {
              iErrors = { ...iErrors, invalidIntervalEnd: true };
            }

            if (
              nonEmpty(interval.start) &&
              nonEmpty(interval.end) &&
              interval.start >= interval.end
            ) {
              iErrors = { ...iErrors, invalidIntervalRange: true };
            }
          }

          if (Object.keys(iErrors).length > 0) {
            intervalErrors[j] = iErrors;
          }
        }

        if (!hasNoOverlapsIntervals(intervals)) {
          eErrors = { ...eErrors, overlappingIntervals: true };
        }

        const hasIntervalErrors = intervalErrors.some(err => err !== null);
        if (hasIntervalErrors) {
          eErrors = { ...eErrors, intervals: intervalErrors };
        }
      }

      if (Object.keys(eErrors).length > 0) {
        exceptionErrors[i] = eErrors;
      }
    }

    const hasExceptionErrors = exceptionErrors.some(err => err !== null);
    return hasExceptionErrors ? { exceptions: exceptionErrors } : null;
  }

  /* --------------------------------
  * SCHEDULE EXCEPTIONS ERROR STRUCTURE
  ----------------------------------- */
  // 0. { invalidExceptions: true }
  // 1. { invalidExceptionsArray: true }
  // 2.
  // {
  //   exceptions: [
  //     null,                             // exception 0 ok
  //     { invalidException: true },       // exception 1
  //     { invalidExceptionType: true },
  //     { invalidIntervals: true },
  //     { missingIntervals: true },
  //     {                                 // exception 2
  //       invalidAppliesTo: true,
  //       overlappingIntervals: true,
  //       intervals: [
  //         null,                         // interval 0 ok
  //         { invalidInterval: true }
  //         { invalidIntervalStart: true, invalidIntervalEnd: true, invalidIntervalRange: true }
  //       ]
  //     }
  //   ]
  // }

  readonly exceptionsStep = new StepController(
    this.exceptionsForm,
    (v: {
      exceptions: {
        label: string;
        type: "oneOff" | "range" | "annual";
        appliesTo: any;
        isClosed: boolean;
        intervals: { start: string; end: string }[];
      }[];
    }) =>
      !!v &&
      Array.isArray(v.exceptions) &&
      v.exceptions.every(e =>
        !!e &&
        isValidExceptionType(e) &&
        isValidAppliesTo(e) &&
        Array.isArray(e.intervals) &&
        (
          e.isClosed
            ? true
            : e.intervals.length > 0 &&
              e.intervals.every(i =>
                !!i &&
                nonEmpty(i.start) &&
                nonEmpty(i.end) &&
                isValidTime(i.start) &&
                isValidTime(i.end) &&
                i.start < i.end
              ) &&
              hasNoOverlapsIntervals(e.intervals)
        )
      )
  );

  /* ---------------- Commerce ---------------- */

  private readonly categoriesForm = this.fb.array<CategoryForm>([], {validators: this.categoriesArrayValidator});

  private categoriesArrayValidator(control: AbstractControl): ValidationErrors | null {
    const arr = control as FormArray;
    const controls = arr.controls;

    const categoryErrors: (ValidationErrors | null)[] = new Array(controls.length).fill(null);

    for (let i = 0; i < controls.length; i++) {
      const name = controls[i].get('name')?.value?.trim() || '';
      if (!name) categoryErrors[i] = { emptyName: true };
    }

    const names = controls.map(c => c.get('name')?.value?.trim() || '');
    const seen = new Set<string>();

    for (let i = 0; i < names.length; i++) {
      if (!names[i]) continue;
      if (seen.has(names[i])) {
        categoryErrors[i] = { ...categoryErrors[i], duplicateName: true };
      } else {
        seen.add(names[i]);
      }
    }

    const hasErrors = categoryErrors.some(e => e !== null);
    return hasErrors ? { categories: categoryErrors } : null;
  }
  /* --------------------------------
  * CATEGORIES ERROR STRUCTURE
  ----------------------------------- */
  // {
  //   categories: [
  //     null,                          // category 0 ok
  //     { emptyName: true },           // category 1 has no name
  //     { duplicateName: true },       // category 2 duplicates another
  //   ]
  // }

  readonly categoriesStep = new StepController(
    this.categoriesForm,
    (v: {
      localID: string;
      name: string;
    }[]) =>
      !!v &&
      Array.isArray(v) &&
      v.every(c =>
        !!c && nonEmpty(c.name)
      ) &&
      hasUniqueCategoryNames(v)
  );
  private readonly servicesForm = this.fb.array<ServiceForm>([], {validators: this.servicesArrayValidator});

  private servicesArrayValidator(control: AbstractControl): ValidationErrors | null {
    const arr = control as FormArray;
    const v = arr.value as {
      localID: string;
      id: string;
      name: string;
      link: string;
      category: string;
      type: string[];
      price: string;
      currency: string;
      duration: number;
      prerequiredService: string | null;
      description: string;
      thumbnail: { url: string; file: File | null };
      gallery: { url: string; file: File | null; timestamp: number }[];
    }[];
    
    if (!Array.isArray(v) || v.length === 0) return { required: true };

    const serviceErrors: (ValidationErrors | null)[] = new Array(v.length).fill(null);

    for (let i = 0; i < v.length; i++) {
      const s = v[i];
      let sErrors: ValidationErrors = {};

      if (!s) { serviceErrors[i] = { invalidService: true }; continue; }
      if (!nonEmpty(s.localID)) sErrors = { ...sErrors, missingLocalID: true };
      if (!nonEmpty(s.name)) sErrors = { ...sErrors, missingName: true };
      if (!nonEmpty(s.link)) sErrors = { ...sErrors, missingLink: true };
      if (!nonEmpty(s.category)) sErrors = { ...sErrors, missingCategory: true };
      if (!nonEmpty(s.currency)) sErrors = { ...sErrors, missingCurrency: true };
      if (!nonEmpty(s.price)) sErrors = { ...sErrors, missingPrice: true };
      else if (!isValidPrice(s.price)) sErrors = { ...sErrors, invalidPrice: true };
      if (!Number.isFinite(s.duration)) sErrors = { ...sErrors, missingDuration: true };
      else if (!isBetween(s.duration, 0, 1440, false)) sErrors = { ...sErrors, invalidDuration: true };
      if (!Array.isArray(s.type) || !s.type.every(nonEmpty)) sErrors = { ...sErrors, invalidServiceTypes: true };
      if (!isValidImage(s.thumbnail)) sErrors = { ...sErrors, invalidThumbnail: true };
      if (!Array.isArray(s.gallery) || !s.gallery.every(isValidTimestampedImage)) sErrors = { ...sErrors, invalidGallery: true };

      if (Object.keys(sErrors).length > 0) serviceErrors[i] = sErrors;
    }

    const packageLinks = new Set<string>();
    if (this.packagesForm && Array.isArray(this.packagesForm.value)) {
      for (const p of this.packagesForm.value) {
        if (p && nonEmpty(p.link)) {
          packageLinks.add(p.link!);
        }
      }
    }
    
    const seenServices = new Map<string, number>();
    for (let i = 0; i < v.length; i++) {
      const link = v[i]?.link;
      if (!nonEmpty(link)) continue;

      if(seenServices.has(link)) {
        const firstIndex = seenServices.get(link)!;
        serviceErrors[firstIndex] = {
          ...(serviceErrors[firstIndex] ?? {}),
          duplicateLink: true
        };
        serviceErrors[i] = {
          ...(serviceErrors[i] ?? {}),
          duplicateLink: true
        };
      } else {
        seenServices.set(link, i);
      }

      if(packageLinks.has(link)) {
        serviceErrors[i] = {
          ...(serviceErrors[i] ?? {}),
          duplicateLink: true
        }
      }
    }

    const hasErrors = serviceErrors.some(e => e !== null);
    return hasErrors ? { services: serviceErrors } : null;
  }
  /* --------------------------------
  * SERVICES ERROR STRUCTURE
  ----------------------------------- */
  // 0. { required: true }  // array is empty or not an array
  // 1.
  // {
  //   services: [
  //     null,                       // service 0 ok
  //     { invalidService: true },   // service 1 — null/undefined entry
  //     {                           // service 2 — multiple field errors
  //       missingLocalID: true,
  //       missingName: true,
  //       missingLink: true,
  //       missingCategory: true,
  //       missingCurrency: true,
  //       missingPrice: true
  //       invalidPrice: true,
  //       missingDuration: true,
  //       invalidDuration: true,
  //       invalidServiceTypes: true,
  //       invalidThumbnail: true,
  //       invalidGallery: true
  //     },
  //     {                           // service 3 — duplicate link (first occurrence)
  //       duplicateLink: true
  //     },
  //     null,                       // service 4 ok
  //     {                           // service 5 — duplicate link + other errors
  //       duplicateLink: true       // duplicates service 3's link
  //     }
  //   ]
  // }

  readonly servicesStep = new StepController(
    this.servicesForm,
    (v: {
      localID: string;
      id: string;
      name: string;
      link: string;
      category: string;
      type: string[];
      price: string;
      currency: string;
      duration: number;
      prerequiredService: string | null;
      description: string;
      thumbnail: {
        url: string;
        file: File | null;
      };
      gallery: {
        url: string;
        file: File | null;
        timestamp: number;
      }[];
    }[]) =>
      Array.isArray(v) &&
      v.every(s =>
        !!s &&
        nonEmpty(s.localID) &&
        nonEmpty(s.name) &&
        nonEmpty(s.link) &&
        nonEmpty(s.category) &&
        nonEmpty(s.currency) &&
        isValidPrice(s.price) &&
        isBetween(s.duration, 0, 1440, false) &&
        Array.isArray(s.type) &&
        s.type.every(nonEmpty) &&
        isValidImage(s.thumbnail) &&
        Array.isArray(s.gallery) &&
        s.gallery.every(isValidTimestampedImage)
      )  && hasUniqueServiceLinks(v)
      && this.hasUniqueLinks()
  );

  private readonly packagesForm = this.fb.array<PackageForm>([], {validators: this.packagesArrayValidator});
  
  private packagesArrayValidator(control: AbstractControl): ValidationErrors | null {
    const arr = control as FormArray;
    const v = arr.value as {
      localID: string;
      id: string;
      name: string;
      link: string;
      price: string;
      currency: string;
      duration: number;
      services: string[];
      description: string;
    }[];

    const packageErrors: (ValidationErrors | null)[] = new Array(v.length).fill(null);

    for (let i = 0; i < v.length; i++) {
      const p = v[i];
      let pErrors: ValidationErrors = {};

      if (!p) { packageErrors[i] = { invalidPackage: true }; continue; }
      if (!nonEmpty(p.localID)) pErrors = { ...pErrors, missingLocalID: true };
      if (!nonEmpty(p.name)) pErrors = { ...pErrors, missingName: true };
      if (!nonEmpty(p.link)) pErrors = { ...pErrors, missingLink: true };
      if (!nonEmpty(p.currency)) pErrors = { ...pErrors, missingCurrency: true };
      if (!nonEmpty(p.price)) pErrors = { ...pErrors, missingPrice: true };
      else if (!isValidPrice(p.price)) pErrors = { ...pErrors, invalidPrice: true };
      if (!Number.isFinite(p.duration)) pErrors = { ...pErrors, missingDuration: true };
      else if (!isBetween(p.duration, 0, 1440, false)) pErrors = { ...pErrors, invalidDuration: true };
      if (!Array.isArray(p.services) || p.services.length === 0) {
        pErrors = { ...pErrors, missingServices: true };
      } else {
        if (!p.services.every(nonEmpty)) pErrors = { ...pErrors, invalidServices: true };
        if (!hasUniqueStrings(p.services)) pErrors = { ...pErrors, duplicateServices: true };
      }

      if (Object.keys(pErrors).length > 0) packageErrors[i] = pErrors;
    }


    
    const serviceLinks = new Set<string>();
    if (this.servicesForm && Array.isArray(this.servicesForm.value)) {
      for (const s of this.servicesForm.value) {
        if (s && nonEmpty(s.link)) {
          serviceLinks.add(s.link!);
        }
      }
    }
    
    const seenPackages = new Map<string, number>();
    for (let i = 0; i < v.length; i++) {
      const link = v[i]?.link;
      if (!nonEmpty(link)) continue;

      if(seenPackages.has(link)) {
        const firstIndex = seenPackages.get(link)!;
        packageErrors[firstIndex] = {
          ...(packageErrors[firstIndex] ?? {}),
          duplicateLink: true
        };
        packageErrors[i] = {
          ...(packageErrors[i] ?? {}),
          duplicateLink: true
        };
      } else {
        seenPackages.set(link, i);
      }

      if(serviceLinks.has(link)) {
        packageErrors[i] = {
          ...(packageErrors[i] ?? {}),
          duplicateLink: true
        }
      }
    }
    const hasErrors = packageErrors.some(e => e !== null);
    return hasErrors ? { packages: packageErrors } : null;
  }

  /* --------------------------------
  * PACKAGES ERROR STRUCTURE
  ----------------------------------- */
  // {
  //   packages: [
  //     null,                          // package 0 ok
  //     { invalidPackage: true },      // package 1 — null/undefined entry
  //     {                              // package 2 — multiple field errors
  //       missingLocalID: true,
  //       missingName: true,
  //       missingLink: true,
  //       missingCurrency: true,
  //       missingPrice: true,
  //       invalidPrice: true,
  //       missingDuration: true,
  //       invalidDuration: true,
  //     },
  //     {                              // package 3 — services errors
  //       missingServices: true,       // services is empty or not an array
  //     },
  //     {                              // package 4 — services content errors
  //       invalidServices: true,       // one or more service strings are empty
  //       duplicateServices: true      // duplicate service IDs within the package
  //     },
  //     { duplicateLink: true },       // package 5 — first occurrence of duplicate link
  //     null,                          // package 6 ok
  //     { duplicateLink: true }        // package 7 — duplicates package 5's link
  //   ]
  // }


  readonly packagesStep = new StepController(
    this.packagesForm,
    (v: {
      localID: string;
      id: string;
      name: string;
      link: string;
      price: string;
      currency: string;
      duration: number;
      services: string[];
      description: string;
    }[]) =>
      Array.isArray(v) &&
      v.every(p =>
        !!p &&
        nonEmpty(p.localID) &&
        nonEmpty(p.name) &&
        nonEmpty(p.link) &&
        nonEmpty(p.currency) &&
        isValidPrice(p.price) &&
        isBetween(p.duration, 0, 1440, false) &&
        Array.isArray(p.services) &&
        p.services.length > 0 &&
        p.services.every(nonEmpty) &&
        hasUniqueStrings(p.services)
      ) && hasUniquePackageLinks(v) 
      && this.hasUniqueLinks()
  );

  private readonly discountsForm = this.fb.array<DiscountForm>([], {validators: this.discountsArrayValidator});
  private discountsArrayValidator(control: AbstractControl): ValidationErrors | null {
    const arr = control as FormArray;
    const v = arr.value as {
      localID: string;
      article: { id: string; type: "service" | "package" };
      percentage: number;
    }[];

    const discountErrors: (ValidationErrors | null)[] = new Array(v.length).fill(null);

    for (let i = 0; i < v.length; i++) {
      const d = v[i];
      let dErrors: ValidationErrors = {};

      if (!d) { discountErrors[i] = { invalidDiscount: true }; continue; }
      if (typeof d.localID !== "string" || isWhitespace(d.localID)) dErrors = { ...dErrors, missingLocalID: true };
      if (!d.article) {
        dErrors = { ...dErrors, missingArticle: true };
      } else {
        if (typeof d.article.id !== "string" || isWhitespace(d.article.id)) dErrors = { ...dErrors, missingArticleLocalID: true };
        if (d.article.type !== "service" && d.article.type !== "package") dErrors = { ...dErrors, invalidArticleType: true };
      }
      if (!d.percentage || !Number.isFinite(d.percentage)) dErrors = { ...dErrors, missingPercentage: true }
      else if (d.percentage <= 0 || d.percentage > 100) dErrors = { ...dErrors, invalidPercentage: true };

      if (Object.keys(dErrors).length > 0) discountErrors[i] = dErrors;
    }

    const seen = new Map<string, number>();
    for (let i = 0; i < v.length; i++) {
      const articleID = v[i]?.article?.id;
      if (!articleID || isWhitespace(articleID)) continue;
      if (seen.has(articleID)) {
        const firstIndex = seen.get(articleID)!;
        discountErrors[firstIndex] = { ...discountErrors[firstIndex], duplicateArticleTarget: true };
        discountErrors[i] = { ...discountErrors[i], duplicateArticleTarget: true };
      } else {
        seen.set(articleID, i);
      }
    }

    const hasErrors = discountErrors.some(e => e !== null);
    return hasErrors ? { discounts: discountErrors } : null;
  }

  /* --------------------------------
  * DISCOUNTS ERROR STRUCTURE
  ----------------------------------- */
  // {
  //   discounts: [
  //     null,                         // discount 0 ok
  //     { invalidDiscount: true },    // discount 1 — null/undefined entry
  //     {                             // discount 2 — multiple field errors
  //       missingLocalID: true,
  //       missingArticle: true,       // article is null/undefined
  //       invalidPercentage: true     // missingArticleLocalID and invalidArticleType
  //     },                            // are skipped since article itself is missing
  //     {                             // discount 3 — article present but invalid
  //       missingArticleLocalID: true,
  //       invalidArticleType: true,
  //       invalidPercentage: true
  //     },
  //     {                             // discount 4 — duplicate article target (first occurrence)
  //       duplicateArticleTarget: true
  //     },
  //     null,                         // discount 5 ok
  //     {                             // discount 6 — duplicate article target + other errors
  //       duplicateArticleTarget: true  // duplicates discount 4's article localID
  //     }
  //   ]
  // }

  readonly discountsStep = new StepController(
    this.discountsForm,  
    (v: {
      localID: string;
      article: { id: string; type: "service" | "package" };
      percentage: number;
    }[]) =>
      Array.isArray(v) &&
      v.every(d =>
        !!d &&
        typeof d.localID === "string" &&
        !isWhitespace(d.localID) &&
        !!d.article &&
        typeof d.article.id === "string" &&
        !isWhitespace(d.article.id) &&
        (d.article.type === "service" || d.article.type === "package") &&
        Number.isFinite(d.percentage) &&
        d.percentage > 0 &&
        d.percentage <= 100
      ) &&
      hasUniqueArticleTargets(v)
  );

  private readonly commerceForm = this.fb.group({
    categories: this.categoriesForm,
    services: this.servicesForm,
    packages: this.packagesForm,
    discounts: this.discountsForm
  });

  readonly commerceStep = new StepController(this.commerceForm);
  
  /* ---------------- Booking Rules ---------------- */

  private readonly bookingRulesForm = this.fb.group({
    emailReminders: this.fb.control(true, Validators.required),
    smsReminders: this.fb.control(false, Validators.required),
    visible: this.fb.control(true, Validators.required),
    minAhead: this.fb.control<number | undefined>(1440, { validators: [Validators.required, Validators.min(30)]}), // default. 1 day, minimum. 30 min
    maxAhead: this.fb.control<number | undefined>(43200, { validators: [Validators.required, Validators.min(10080)]}) // default. 30 days, minimum. 7 days
  }, {validators: [this.bookingRulesValidator]});
  
  private bookingRulesValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value as {
      emailReminders: boolean;
      smsReminders: boolean;
      visible: boolean;
      minAhead: number | undefined;
      maxAhead: number | undefined;
    };

    if (!v) return { invalidBookingRules: true };

    let errors: ValidationErrors = {};

    if (typeof v.emailReminders !== "boolean") errors = { ...errors, invalidEmailReminders: true };
    if (typeof v.smsReminders !== "boolean") errors = { ...errors, invalidSmsReminders: true };
    if (typeof v.visible !== "boolean") errors = { ...errors, invalidVisible: true };
    
    if(!v.minAhead || !Number.isFinite(v.minAhead)) errors = { ...errors, missingMinAhead: true };
    else if (v.minAhead < 30) errors = { ...errors, invalidMinAhead: true };
    
    if(!v.maxAhead || !Number.isFinite(v.maxAhead)) errors = { ...errors, missingMaxAhead: true };
    else if (v.maxAhead < 10080) errors = { ...errors, invalidMaxAhead: true };
    
    if (v.minAhead && v.maxAhead && Number.isFinite(v.minAhead) && Number.isFinite(v.maxAhead) && v.minAhead > v.maxAhead) {
      errors = { ...errors, minAheadExceedsMaxAhead: true };
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  /* --------------------------------
  * BOOKING RULES ERROR STRUCTURE
  ----------------------------------- */
  // 0. { invalidBookingRules: true }    // v is null/undefined
  // 1. { invalidEmailReminders: true }  // emailReminders is not a boolean
  // 2. { invalidSmsReminders: true }    // smsReminders is not a boolean
  // 3. { invalidMinAhead: true }        // minAhead is not finite or < 30 minutes
  // 4. { invalidMaxAhead: true }        // maxAhead is not finite or < 10080 minutes (7 days)
  // 5. { minAheadExceedsMaxAhead: true }// minAhead > maxAhead (only when both are individually valid)

  readonly bookingRulesStep = new StepController(
    this.bookingRulesForm,
    (v: {
      emailReminders: boolean;
      smsReminders: boolean;
      visible: boolean;
      minAhead: number;
      maxAhead: number;
    }) =>
      !!v &&
      typeof v.emailReminders === "boolean" &&
      typeof v.smsReminders === "boolean" &&
      typeof v.visible === "boolean" &&
      Number.isFinite(v.minAhead) &&
      Number.isFinite(v.maxAhead) &&
      v.minAhead >= 30 && // 30 minutes
      v.maxAhead >= 10080 && // 7 days
      v.minAhead <= v.maxAhead
  );

  /* ----------------------------------------------------------
   * Wizard-Level Derived State
   * ---------------------------------------------------------- */

  constructor(){
    effect(() => {
      const selected = this.singleProvider.selected();
      if(!selected || !isOwner(selected)) return;

      const studio = this.singleProvider.activeStudio();
      const services = this.singleProvider.activeStudioServices();
      const packages = this.singleProvider.activeStudioPackages();

      this.profileForm.patchValue({
        studioName: studio?.name ?? '',
        studioLink: studio?.link ?? '',
        studioTypes: studio?.type ?? [],
        instagram: studio?.instagramLink ?? '',
        facebook: studio?.facebookLink ?? '',
        contactEmail: studio?.contactEmail ?? '',
        contactPhone: studio?.contactPhone ?? '',
        whatsappPhone: studio?.whatsAppPhone ?? '',
      })
      this.profileForm.setValidators(this.profileValidator);
      this.profileForm.markAsPristine();
      this.profileForm.markAsUntouched();
      this.profileStep.markAsSaved();

      this.locationForm.patchValue({
        country: studio?.country ?? '',
        city: studio?.city ?? '',
        street: studio?.street ?? '',
        buildingNumber: studio?.buildingNumber ?? '',
        apartmentNumber: studio?.apartmentNumber ?? '',
        longitude: studio?.longitude ?? 0,
        latitude: studio?.latitude ?? 0,
      })
      this.locationForm.setValidators(this.locationValidator);
      this.locationForm.markAsPristine();
      this.locationForm.markAsUntouched();
      this.locationStep.markAsSaved();

      this.bookingRulesForm.patchValue({
        emailReminders: studio?.emailReminders ?? true,
        smsReminders: studio?.smsReminders ?? false,
        visible: studio?.visible ?? true,
        minAhead: studio?.minScheduleAhead ?? 1440,
        maxAhead: studio?.maxScheduleAhead ?? 43200,
      })
      this.bookingRulesForm.setValidators(this.bookingRulesValidator);
      this.bookingRulesForm.markAsPristine();
      this.bookingRulesForm.markAsUntouched();
      this.bookingRulesStep.markAsSaved()
      

      if(studio){
        
        const thumbnail = new FormGroup({
          url: new FormControl<string>(studio.thumbnail, {nonNullable: true, validators: [Validators.required]}),
          file: new FormControl<File | null>(null, { validators: [Validators.required] } )
        })
        
        const HeroImages = new FormArray<HeroImageForm>(
          studio.heroImages.map(hi =>
            new FormGroup({
              id: new FormControl<string>(hi.id, {nonNullable: true}),
              key: new FormControl<string>(hi.key, {nonNullable: true}),
              url: new FormControl<string>(hi.url, {nonNullable: true}),
              file: new FormControl<File | null>(null)
            })
          )
        )

        this.mediaForm.setControl('thumbnail', thumbnail);
        this.mediaForm.setControl('heroImages', HeroImages);
        this.mediaForm.setValidators(this.mediaValidator);
        this.mediaForm.markAsPristine();
        this.mediaForm.markAsUntouched();
        this.mediaStep.markAsSaved();
      }

      const dayNames = [ '', 'DATE.MONDAY', 'DATE.TUESDAY', 'DATE.WEDNESDAY', 'DATE.THURSDAY', 'DATE.FRIDAY', 'DATE.SATURDAY', 'DATE.SUNDAY'];
      if (studio) {
        if(studio.weeklySchedules.length){

          const scheduleControls: ScheduleForm[] = studio.weeklySchedules.map((e, i) => {

            return new FormGroup({
              localID: this.fb.control<string>(studio.weeklySchedules[i].id, { validators: [Validators.required] }),
              id: this.fb.control<string>(studio.weeklySchedules[i].id, { validators: [Validators.required] }),
              days: this.fb.array(
                studio.weeklySchedules[i].days.map(day => {
                  return this.fb.group({
                    day: this.fb.control<string>(dayNames[day.dayOfWeek]),
                    open: this.fb.control<boolean>(!day.isClosed),
                    intervals: this.fb.array(
                      (day.intervals ?? []).map(interval =>
                        this.fb.group({
                          start: this.fb.control<string>(interval.start, Validators.required),
                          end: this.fb.control<string>(interval.end, Validators.required)
                        })
                      )
                    )
                  })
                })
              ),
              effectiveFrom: this.fb.control(studio.weeklySchedules[i].effectiveFrom ?? null),
              effectiveTo: this.fb.control(studio.weeklySchedules[i].effectiveTo ?? null),
            }, {validators: [this.scheduleValidator]})
          })
          .filter((control): control is ScheduleForm => control !== undefined);

          const schedulesArray = new FormArray<ScheduleForm>(scheduleControls, {validators: [this.scheduleArrayValidator]});
          this.scheduleForm.setControl('schedules', schedulesArray);

          this.scheduleForm.markAsPristine();
          this.scheduleForm.markAsUntouched();
          this.scheduleStep.markAsSaved();
        }

        if (studio.exceptions.length) {

          const exceptionControls: ExceptionForm[] = studio.exceptions.map((e) => {

            const intervalsArray = new FormArray<IntervalForm>(
              (e.intervals ?? []).map(i =>
                new FormGroup({
                  start: new FormControl<string>(i.start, { nonNullable: true, validators: Validators.required }),
                  end: new FormControl<string>(i.end, { nonNullable: true, validators: Validators.required }),
                })
              )
            );

            switch (e.appliesTo.type) {

              case 'annual':
                return new FormGroup({
                  localID: new FormControl<string>(e.id, { nonNullable: true}),
                  id: new FormControl<string>(e.id, {nonNullable: true}),
                  label: new FormControl<string>(e.label, { nonNullable: true }),
                  type: new FormControl<'annual'>('annual', { nonNullable: true }),
                  appliesTo: new FormGroup({
                    day: new FormControl<number>(e.appliesTo.day, { nonNullable: true, validators: Validators.required }),
                    month: new FormControl<number>(e.appliesTo.month, { nonNullable: true, validators: Validators.required }),
                  }),
                  isClosed: new FormControl<boolean>(e.isClosed, { nonNullable: true }),
                  intervals: intervalsArray,
                }) as AnnualExceptionForm;

              case 'range':
                return new FormGroup({
                  localID: new FormControl<string>(e.id, { nonNullable: true}),
                  id: new FormControl<string>(e.id, {nonNullable: true}),
                  label: new FormControl<string>(e.label, { nonNullable: true }),
                  type: new FormControl<'range'>('range', { nonNullable: true }),
                  appliesTo: new FormGroup({
                    startDate: new FormControl<string>(e.appliesTo.startDate, { nonNullable: true, validators: Validators.required }),
                    endDate: new FormControl<string>(e.appliesTo.endDate, { nonNullable: true, validators: Validators.required }),
                  }),
                  isClosed: new FormControl<boolean>(e.isClosed, { nonNullable: true }),
                  intervals: intervalsArray,
                }) as RangeExceptionForm;

              case 'oneOff':
                return new FormGroup({
                  localID: new FormControl<string>(e.id, { nonNullable: true}),
                  id: new FormControl<string>(e.id, {nonNullable: true}),
                  label: new FormControl<string>(e.label, { nonNullable: true }),
                  type: new FormControl<'oneOff'>('oneOff', { nonNullable: true }),
                  appliesTo: new FormGroup({
                    date: new FormControl<string>(e.appliesTo.date, { nonNullable: true, validators: Validators.required }),
                  }),
                  isClosed: new FormControl<boolean>(e.isClosed, { nonNullable: true }),
                  intervals: intervalsArray,
                }) as OneOffExceptionForm;
            }
          })
          .filter((control): control is ExceptionForm => control !== undefined);

          const exceptionsArray = new FormArray<ExceptionForm>(exceptionControls);

          this.exceptionsForm.setControl('exceptions', exceptionsArray);
          this.exceptionsForm.setValidators(this.exceptionsValidator);

          this.exceptionsForm.markAsPristine();
          this.exceptionsForm.markAsUntouched();
          this.exceptionsStep.markAsSaved();
        }

        if(studio.categories.length >= 0){
          this.categoriesForm.clear();
          studio.categories.forEach(c =>
            this.categoriesForm.push(
              this.fb.group({
                localID: this.fb.control<string>(c.id, { validators: [Validators.required] }),
                id: this.fb.control<string>(c.id, { validators: [Validators.required] }),
                name: this.fb.control<string>(c.name, { validators: [Validators.required] })
              })
            )
          );
          this.categoriesForm.setValidators(this.categoriesArrayValidator);
          this.categoriesStep.markAsSaved();
        }

        let discountControls: DiscountForm[] = []
        if(services.length){
          const serviceControls: ServiceForm[] = services.map(s => {

            const gallery : GalleryImageForm[] = s.gallery.map(i => {
              return new FormGroup({
                id: new FormControl<string>(i.id, { nonNullable: true}),
                key: new FormControl<string>(i.key, {nonNullable: true}),
                url: new FormControl<string>(i.url, {nonNullable: true}),
                file: new FormControl<File | null>(null),
                timestamp: new FormControl<number>(i.timestamp, {nonNullable: true}),
              })
            })

            if(s.discount !== 0){
              discountControls.push(
                new FormGroup({
                  localID: new FormControl<string>(crypto.randomUUID(), {nonNullable: true}),
                  article: new FormControl<{id: string, type: 'service' | 'package'}>({id: s.id, type: 'service'}, {nonNullable: true}),
                  percentage: new FormControl<number | undefined>(s.discount, {nonNullable: true})
                })
              )
            }

            return new FormGroup({
              localID: new FormControl<string>(s.id, {nonNullable: true}),
              id: new FormControl<string>(s.id, {nonNullable: true}),
              name: new FormControl<string>(s.name, {nonNullable: true}),
              link: new FormControl<string>(s.link, {nonNullable: true}),
              category: new FormControl<string>(s.category, {nonNullable: true}),
              type: new FormControl<string[]>(s.type, {nonNullable: true}),
              price: new FormControl<string>(s.price, {nonNullable: true}),
              currency: new FormControl<string>(s.currency, {nonNullable: true}),
              duration: new FormControl<number | undefined>(s.duration, {nonNullable: true}),
              prerequiredService: new FormControl<string | null>(s.prerequiredService, {nonNullable: true}),
              description: new FormControl<string>(s.description, {nonNullable: true}),
              thumbnail: new FormGroup({
                id: new FormControl<string>(s.thumbnail.id, {nonNullable: true}),
                key: new FormControl<string>(s.thumbnail.key, {nonNullable: true}),
                url: new FormControl<string>(s.thumbnail.url, {nonNullable: true}),
                file: new FormControl<File | null>(null)
              }),
              gallery: new FormArray<GalleryImageForm>(gallery),
            })
          });

          
          if(serviceControls.length){
            this.servicesForm.clear();
            serviceControls.forEach(s => this.servicesForm.push(s));
            this.servicesForm.setValidators(this.servicesArrayValidator);
            this.servicesStep.markAsSaved();
          }

          if(packages.length){
            const packageControls: PackageForm[] = packages.map(p => {

              if(p.discount !== 0){
                discountControls.push(
                  new FormGroup({
                    localID: new FormControl<string>(crypto.randomUUID(), {nonNullable: true}),
                    article: new FormControl<{id: string, type: 'service' | 'package'}>({id: p.id, type: 'package'}, {nonNullable: true}),
                    percentage: new FormControl<number | undefined>(p.discount, {nonNullable: true})
                  })
                )
              }

              return new FormGroup({
                localID: new FormControl<string>(p.id, {nonNullable: true}),
                id: new  FormControl<string>(p.id, {nonNullable: true}),
                name: new FormControl<string>(p.name, {nonNullable: true}),
                link: new FormControl<string>(p.link, {nonNullable: true}),
                price: new FormControl<string>(p.price, {nonNullable: true}),
                currency: new FormControl<string>(p.currency, {nonNullable: true}),
                duration: new FormControl<number | undefined>(p.duration, {nonNullable: true}),
                services: new FormControl<string[]>(
                  p.services.flatMap(ps => {
                    const found = serviceControls.find(s => s.controls.id.value === ps);
                    return found ? [found.controls.localID.value] : [];
                  }),
                { nonNullable: true }),
                description: new FormControl<string>(p.description, {nonNullable: true}),
              })

            })

            if(packageControls.length){
              this.packagesForm.clear();
              packageControls.forEach(p => this.packagesForm.push(p));
              this.packagesForm.setValidators(this.packagesArrayValidator);
              this.packagesStep.markAsSaved();
            }
          }
          


          if(discountControls.length){
            this.discountsForm.clear();
            discountControls.forEach(dc => this.discountsForm.push(dc));
            this.discountsForm.setValidators(this.discountsArrayValidator);
            this.discountsStep.markAsSaved();
          }
        }

        this.commerceForm.markAsPristine();
        this.commerceForm.markAsUntouched();
        this.commerceStep.markAsSaved();
      }

    });
  }

  private readonly steps = [
    this.profileStep,
    this.locationStep,
    this.mediaStep,
    this.scheduleStep,
    this.exceptionsStep,
    this.commerceStep,
    this.bookingRulesStep
  ];

  readonly setupState = computed<SetupStepState>(() => {
    if (this.steps.every(s => s.setupStepState() === 'empty')) return 'empty';
    if (this.steps.some(s => s.setupStepState() === 'invalid')) return 'invalid';
    if (this.steps.some(s => s.setupStepState() === 'modified')) return 'modified';
    return 'invalid' // ?? some step is selected, so the user is not on publish
  });

  readonly hasAnyUnsavedChanges = computed(() =>
    this.steps.some(s => s.hasUnsavedChanges())
  );

  readonly profileValue = toSignal(
    this.profileForm.valueChanges.pipe(
      startWith(this.profileForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly locationValue = toSignal(
    this.locationForm.valueChanges.pipe(
      startWith(this.locationForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly mediaValue = toSignal(
    this.mediaForm.valueChanges.pipe(
      startWith(this.mediaForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly scheduleValue = toSignal(
    this.scheduleForm.valueChanges.pipe(
      startWith(this.scheduleForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly exceptionsValue = toSignal(
    this.exceptionsForm.valueChanges.pipe(
     startWith(this.exceptionsForm.getRawValue()) 
    ),
    { requireSync: true }
  );

  readonly commerceValue = toSignal(
    this.commerceForm.valueChanges.pipe(
      startWith(this.commerceForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly categoriesValue = toSignal(
    this.categoriesForm.valueChanges.pipe(
      startWith(this.categoriesForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly servicesValue = toSignal(
    this.servicesForm.valueChanges.pipe(
      startWith(this.servicesForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly packagesValue = toSignal(
    this.packagesForm.valueChanges.pipe(
      startWith(this.packagesForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly discountsValue = toSignal(
    this.discountsForm.valueChanges.pipe(
      startWith(this.discountsForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly bookingRulesValue = toSignal(
    this.bookingRulesForm.valueChanges.pipe(
      startWith(this.bookingRulesForm.getRawValue())
    ),
    { requireSync: true }
  );

  readonly profileVm = computed(() => ({
    form: this.profileStep.form,
    value: this.profileValue(),
    state: this.profileStep.setupStepState(),
    hasUnsaved: this.profileStep.hasUnsavedChanges()
  }));

  readonly locationVm = computed(() => ({
    form: this.locationStep.form,
    value: this.locationValue(),
    state: this.locationStep.setupStepState(),
    hasUnsaved: this.locationStep.hasUnsavedChanges()
  }));

  readonly mediaVm = computed(() => ({
    form: this.mediaStep.form,
    value: this.mediaValue(),
    state: this.mediaStep.setupStepState(),
    hasUnsaved: this.mediaStep.hasUnsavedChanges()
  }));

  readonly scheduleVm = computed(() => ({
    form: this.scheduleStep.form,
    value: this.scheduleValue(),
    state: this.scheduleStep.setupStepState(),
    hasUnsaved: this.scheduleStep.hasUnsavedChanges()
  }));

  readonly exceptionsVm = computed(() => ({
    form: this.exceptionsStep.form,
    value: this.exceptionsValue(),
    state: this.exceptionsStep.setupStepState(),
    hasUnsaved: this.exceptionsStep.hasUnsavedChanges()
  }));

  readonly commerceVm = computed(() => ({
    form: this.commerceStep.form,
    value: this.commerceValue(),
    state: this.commerceStep.setupStepState(),
    hasUnsaved: this.commerceStep.hasUnsavedChanges()
  }));

  readonly categoriesVm = computed(() => ({
    form: this.categoriesStep.form,
    value: this.categoriesValue(),
    state: this.categoriesStep.setupStepState(),
    hasUnsaved: this.commerceStep.hasUnsavedChanges()
  }))

  readonly servicesVm = computed(() => ({
    form: this.servicesStep.form,
    value: this.servicesValue(),
    state: this.servicesStep.setupStepState(),
    hasUnsaved: this.servicesStep.hasUnsavedChanges()
  }))
  
  readonly packagesVm = computed(() => ({
    form: this.packagesStep.form,
    value: this.packagesValue(),
    state: this.packagesStep.setupStepState(),
    hasUnsaved: this.packagesStep.hasUnsavedChanges()
  }))
  
  readonly discountsVm = computed(() => ({
    form: this.discountsStep.form,
    value: this.discountsValue(),
    state: this.discountsStep.setupStepState(),
    hasUnsaved: this.discountsStep.hasUnsavedChanges()
  }))

  readonly bookingRulesVm = computed(() => ({
    form: this.bookingRulesStep.form,
    value: this.bookingRulesValue(),
    state: this.bookingRulesStep.setupStepState(),
    hasUnsaved: this.bookingRulesStep.hasUnsavedChanges()
  }));


  /* ----------------------------------------------------------
  * Profile Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */

  setStudioName(name: string): void {
    this.profileForm.controls.studioName.setValue(name);
  }
  setStudioLink(link: string): void {
    this.profileForm.controls.studioLink.setValue(link);
  }
  setStudioTypes(types: readonly string[]): void {
    this.profileForm.controls.studioTypes.setValue([...types]);
  }

  setInstagram(url: string): void {
    this.profileForm.controls.instagram.setValue(url);
  }

  setFacebook(url: string): void {
    this.profileForm.controls.facebook.setValue(url);
  }

  setContactEmail(email: string): void {
    this.profileForm.controls.contactEmail.setValue(email);
  }

  setContactPhone(phone: string): void {
    this.profileForm.controls.contactPhone.setValue(phone);
  }

  setWhatsappPhone(phone: string): void {
    this.profileForm.controls.whatsappPhone.setValue(phone);
  }

  setSearchTags(value: string[]): void {
    this.profileForm.controls.searchTags.setValue(value);
  }

  /* ----------------------------------------------------------
  * Location Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */

  setCountry(country: string): void {
    this.locationForm.controls.country.setValue(country);
  }

  setCity(city: string): void {
    this.locationForm.controls.city.setValue(city);
  }

  setStreet(street: string): void {
    this.locationForm.controls.street.setValue(street);
  }

  setBuildingNumber(value: string): void {
    this.locationForm.controls.buildingNumber.setValue(value);
  }

  setApartmentNumber(value: string): void {
    this.locationForm.controls.apartmentNumber.setValue(value);
  }

  setLatitude(value: number | undefined): void {
    this.locationForm.controls.latitude.setValue(value);
  }

  setLongitude(value: number | undefined): void {
    this.locationForm.controls.longitude.setValue(value);
  }

  /* ----------------------------------------------------------
  * Media Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */
 
  private createHeroImage(file: File): HeroImageForm {
    return new FormGroup({
      id: new FormControl<string>('', {nonNullable: true}),
      key: new FormControl<string>('', {nonNullable: true}),
      url: new FormControl<string>(URL.createObjectURL(file), {nonNullable: true}),
      file: new FormControl<File | null>(file, {nonNullable: true}),
    })
  }

  setThumbnail(thumbnail: File | null): void {
    if(!thumbnail) return;

    const tn = {
      url: URL.createObjectURL(thumbnail),
      file: thumbnail
    }

    this.mediaForm.controls.thumbnail.setValue(tn);
  }

  addHeroImages(files: (File | null)[]): void {
    const gallery = this.mediaForm.get('heroImages');
    if (!(gallery instanceof FormArray)) return;

    const maxImageCount = 3;
    

    const remainingSlots = Math.max(0, maxImageCount - gallery.length);

    if (remainingSlots === 0) return;

    const validFiles = files.filter((f): f is File => f instanceof File && isValidImage({url: '', file: f}));

    const filesToAdd = validFiles.slice(0, remainingSlots);

    filesToAdd.forEach(file => {
      gallery.push( 
        this.createHeroImage(file) 
      );
    });
  }

  removeHeroImage(index: number): void {
    this.mediaForm.controls.heroImages.removeAt(index);
  }

  reorderHero(previousIndex: number, currentIndex: number) {
    const gallery = this.mediaForm.get('heroImages');
    if (!(gallery instanceof FormArray)) return;

    if ( previousIndex === currentIndex ||
        previousIndex < 0 || currentIndex < 0 ||
        previousIndex >= gallery.length || currentIndex >= gallery.length
    ) return;

    const copy = [...gallery.value];
    const [moved] = copy.splice(previousIndex, 1);
    copy.splice(currentIndex, 0, moved);
    gallery.setValue(copy);
  }

  /* ----------------------------------------------------------
  * Schedule Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */

  private createSchedule(timeZone: string, isBase: boolean = false, localID: string | null = null): ScheduleForm {

    let effectiveFrom: string | null = null;
    let effectiveTo: string | null = null;

    if (!isBase) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      effectiveFrom = toYYYY_MM_DD(today, timeZone);
      effectiveTo   = toYYYY_MM_DD(nextWeek, timeZone);
    }

    return new FormGroup({
      localID:       new FormControl<string>(localID ?? crypto.randomUUID(), { nonNullable: true }),
      id:            new FormControl<string>('', { nonNullable: true }),
      days:          this.fb.array<DayForm>(this.generateWeek()),
      effectiveFrom: this.fb.control<string | null>(effectiveFrom),
      effectiveTo:   this.fb.control<string | null>(effectiveTo),
    });
  }

  addSchedule(timeZone: string){
    const schedules = this.scheduleForm.controls.schedules;
    if(!schedules) return;
    schedules.push(this.createSchedule(timeZone));
  }

  removeSchedule(scheduleIndex: number){
    const schedules = this.scheduleForm.controls.schedules;
    if(!schedules) return;
    schedules.removeAt(scheduleIndex);
  }

  setEffectiveFrom(scheduleIndex: number, value: string | null){
    if(scheduleIndex === 0) return;
    const ef = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.effectiveFrom;
    if(!ef) return;
    ef.setValue(value);
  }
  setEffectiveTo(scheduleIndex: number, value: string | null){
    if(scheduleIndex === 0) return;
    const ef = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.effectiveTo;
    if(!ef) return;
    ef.setValue(value);
  }

  setDayOpen(scheduleIndex: number, dayIndex: number, value: boolean): void {
    const day = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.days.at(dayIndex);
    if(!day) return;
    day.controls.open.setValue(value);
  }

  addInterval(scheduleIndex: number, dayIndex: number): void {
    const day = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.days.at(dayIndex);
    if (!day) return;

    const intervals = day.controls.intervals;

    const last = intervals.at(intervals.length - 1);
    if (last && last.invalid) {
      last.markAllAsTouched();
      return;
    }

    intervals.push(this.createInterval());
  }

  removeInterval(scheduleIndex: number, dayIndex: number, intervalIndex: number): void {
    const day = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.days.at(dayIndex);
    if (!day) return;

    day.controls.intervals.removeAt(intervalIndex);
  }

  setIntervalStart(scheduleIndex: number, dayIndex: number, intervalIndex: number, start: string): void {

    const day = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.days.at(dayIndex);
    if (!day) return;
    const interval = day.controls.intervals.at(intervalIndex);
    if(!interval) return;

    interval.controls.start.setValue(start);
  }

  setIntervalEnd(scheduleIndex: number, dayIndex: number, intervalIndex: number, end: string): void {

    const day = this.scheduleForm.controls.schedules.at(scheduleIndex)?.controls.days.at(dayIndex);
    if (!day) return;
    const interval = day.controls.intervals.at(intervalIndex);
    if(!interval) return;

    interval.controls.end.setValue(end);
  }


  /* ----------------------------------------------------------
  * Exception Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */

  private createOneOffException(timeZone: string, localID: string | null = null): OneOffExceptionForm {
    const date = toYYYY_MM_DD(new Date(), timeZone);

    return new FormGroup({
      localID: new FormControl<string>(localID ? localID : crypto.randomUUID(), {nonNullable: true}),
      id: new FormControl<string>('', {nonNullable: true}),
      label: new FormControl<string>('', { nonNullable: true }),
      type: new FormControl<'oneOff'>('oneOff', { nonNullable: true }),
      appliesTo: new FormGroup({
        date: new FormControl<string>(date, { nonNullable: true })
      }),
      isClosed: new FormControl<boolean>(true, { nonNullable: true }),
      intervals: new FormArray<IntervalForm>([])
    });
  }

  private createRangeException(timeZone: string, localID: string | null = null): RangeExceptionForm {
    const today = new Date();
    const start = toYYYY_MM_DD(today, timeZone);

    today.setDate(today.getDate() + 7);
    const end = toYYYY_MM_DD(today, timeZone);

    return new FormGroup({
      localID: new FormControl<string>(localID ? localID : crypto.randomUUID(), {nonNullable: true}),
      id: new FormControl<string>('', {nonNullable: true}),
      label: new FormControl<string>('', { nonNullable: true }),
      type: new FormControl<'range'>('range', { nonNullable: true }),
      appliesTo: new FormGroup({
        startDate: new FormControl<string>(start, { nonNullable: true }),
        endDate: new FormControl<string>(end, { nonNullable: true })
      }),
      isClosed: new FormControl<boolean>(true, { nonNullable: true }),
      intervals: new FormArray<IntervalForm>([])
    });
  }

  private createAnnualException(timeZone: string, localID: string | null = null): AnnualExceptionForm {
    const date = toYYYY_MM_DD(new Date(), timeZone);
    const [, month, day] = date.split('-').map(Number);

    return new FormGroup({
      localID: new FormControl<string>(localID ? localID : crypto.randomUUID(), {nonNullable: true}),
      id: new FormControl<string>('', {nonNullable: true}),
      label: new FormControl<string>('', { nonNullable: true }),
      type: new FormControl<'annual'>('annual', { nonNullable: true }),
      appliesTo: new FormGroup({
        day: new FormControl<number>(day, { nonNullable: true }),
        month: new FormControl<number>(month, { nonNullable: true })
      }),
      isClosed: new FormControl<boolean>(true, { nonNullable: true }),
      intervals: new FormArray<IntervalForm>([])
    });
  }

  addException(timeZone: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    exceptions.push(this.createOneOffException(timeZone));
  }

  removeException(exceptionIndex: number): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    exceptions.removeAt(exceptionIndex);
  }

  setExceptionLabel(exceptionIndex: number, value: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    const exception = exceptions.at(exceptionIndex);
    if(!exception) return;
    exception.controls['label'].setValue(value);
  }
  
  setExceptionType(exceptionIndex: number, value: "oneOff" | "range" | "annual", timeZone: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    const current = exceptions.at(exceptionIndex);
    if (!current) return;
    if(current.controls.type.value === value) return;

    let newException: ExceptionForm;

    switch (value) {
      case 'annual':
        newException = this.createAnnualException(timeZone, current.controls.localID.value);
        break;

      case 'range':
        newException = this.createRangeException(timeZone, current.controls.localID.value);
        break;

      case 'oneOff':
        newException = this.createOneOffException(timeZone, current.controls.localID.value);
        break;
    }

    newException.controls.label.setValue(current.controls.label.value);
    newException.controls.isClosed.setValue(current.controls.isClosed.value);
    (newException as unknown as FormGroup<any>).setControl('intervals', current.controls.intervals);

    exceptions.setControl(exceptionIndex, newException);
  }

  setExceptionAppliesToDate(exceptionIndex: number, date: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    const exception = exceptions.at(exceptionIndex);
    if (!exception) return;
    if(exception.controls.type.value !== 'oneOff') return;
    (exception.controls.appliesTo as OneOffDate).controls.date.setValue(date);
  }

  setExceptionAppliesToDay(exceptionIndex: number, day: number): void {
    if(day < 1 || day > 31) return;
    const exceptions = this.exceptionsForm.controls.exceptions;
    const exception = exceptions.at(exceptionIndex);
    if (!exception) return;
    if(exception.controls.type.value !== 'annual') return;
    (exception.controls.appliesTo as AnnualRecurringDate).controls.day.setValue(day);
  }

  setExceptionAppliesToMonth(exceptionIndex: number, month: number): void {
    if(month < 1 || month > 12) return;
    const exceptions = this.exceptionsForm.controls.exceptions;
    const exception = exceptions.at(exceptionIndex);
    if (!exception) return;
    if(exception.controls.type.value !== 'annual') return;
    (exception.controls.appliesTo as AnnualRecurringDate).controls.month.setValue(month);
  }

  setExceptionAppliesToStartDate(exceptionIndex: number, startDate: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    const exception = exceptions.at(exceptionIndex);
    if (!exception) return;
    if(exception.controls.type.value !== 'range') return;
    (exception.controls.appliesTo as DateRange).controls.startDate.setValue(startDate);
  }

  setExceptionAppliesToEndDate(exceptionIndex: number, endDate: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    const exception = exceptions.at(exceptionIndex);
    if (!exception) return;
    if(exception.controls.type.value !== 'range') return;
    (exception.controls.appliesTo as DateRange).controls.endDate.setValue(endDate);
  }

  setExceptionIsClosed(exceptionIndex: number, value: boolean): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    const exception = exceptions.at(exceptionIndex);
    if(!exception) return;
    exception.controls['isClosed'].setValue(value);
  }

  addExceptionInterval(exceptionIndex: number): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    const exception = exceptions.at(exceptionIndex);
    if(!exception) return;
    exception.controls['intervals'].push(this.createInterval());
  }

  removeExceptionInterval(exceptionIndex: number, intervalIndex: number): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    const exception = exceptions.at(exceptionIndex);
    if(!exception) return;
    const intervals = exception.controls['intervals'];
    if(!intervals) return;
    intervals.removeAt(intervalIndex);
  }

  setExceptionIntervalStart(exceptionIndex: number, intervalIndex: number, value: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    const exception = exceptions.at(exceptionIndex);
    if (!exception) return;

    const interval = exception.controls.intervals.at(intervalIndex);
    if (!interval) return;
    interval.controls.start.setValue(value);
  }

  setExceptionIntervalEnd(exceptionIndex: number, intervalIndex: number, value: string): void {
    const exceptions = this.exceptionsForm.controls.exceptions;
    if(!exceptions) return;
    const exception = exceptions.at(exceptionIndex);
    if(!exception) return;
    const intervals = exception.controls['intervals'];
    if(!intervals) return;
    const interval = intervals.at(intervalIndex);
    if(!interval) return;
    interval.controls.end.setValue(value);
  }

  /* ----------------------------------------------------------
  * Category Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */
  addCategory(): void {
    const categories = this.commerceForm.controls.categories
    categories.push(this.fb.group({
      localID: this.fb.control<string>(crypto.randomUUID(), Validators.required),
      id: this.fb.control<string>('', Validators.required),
      name: this.fb.control('', Validators.required)
    }));
  }

  removeCategory(categoryIndex: number): void {
    const categories = this.commerceForm.controls.categories
    categories.removeAt(categoryIndex);
  }

  setCategory(categoryIndex: number, value: string): void {
    const categories = this.commerceForm.controls.categories
    if(categories.length <= categoryIndex) return;
    categories.at(categoryIndex).controls.name.setValue(value);
  }

  reorderCategory(moved: number, target: number): void {
    const categories = this.commerceForm.controls.categories;
    const toMove = categories.at(moved);
    categories.removeAt(moved);
    categories.insert(target, toMove);
  }

  /* ----------------------------------------------------------
  * Services Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */
  
  private createService(): ServiceForm {
    const country = this.locationValue().country;
    const currency = country ? ( COUNTRY_CURRENCY.get(country!) ?? '' ) : ''
    return new FormGroup({
        localID: new FormControl<string>(crypto.randomUUID(), {nonNullable: true}), 
        id: new FormControl<string>('', {nonNullable: true}),
        name: new FormControl<string>('', {nonNullable: true}),
        link: new FormControl<string>('', {nonNullable: true}),
        category: new FormControl<string>('', {nonNullable: true}),
        type: new FormControl<string[]>([], {nonNullable: true}),
        price: new FormControl<string>('', {nonNullable: true}),
        currency: new FormControl<string>(currency, {nonNullable: true}),
        duration: new FormControl<number | undefined>(undefined, {nonNullable: true}),
        prerequiredService: new FormControl<string | null>(null, {nonNullable: true}),
        description: new FormControl<string>('', {nonNullable: true}),
        thumbnail: new FormGroup({
          id: new FormControl<string>('', {nonNullable: true}),
          key: new FormControl<string>('', {nonNullable: true}),
          url: new FormControl<string>('', {nonNullable: true}),
          file: new FormControl<File | null>(null)
        }),
        gallery: new FormArray<GalleryImageForm>([])
    })
  }

  private createGalleryImage(file: File): GalleryImageForm {
    const now = new Date().getTime();

    return new FormGroup({
      id: new FormControl<string>('', {nonNullable: true}),
      key: new FormControl<string>('', {nonNullable: true}),
      url: new FormControl<string>(URL.createObjectURL(file), {nonNullable: true}),
      file: new FormControl<File | null>(file, {nonNullable: true}),
      timestamp: new FormControl<number>(now, {nonNullable: true})
    })
  }

  addService(): void {
    const services = this.commerceForm.controls.services
    services.push(this.createService());
  }

  removeService(serviceIndex: number): void {
    const services = this.commerceForm.controls.services
    services.removeAt(serviceIndex);
  }

  setServiceName(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.name.setValue(value);
  }

  setServiceLink(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.link.setValue(value);
  }

  setServiceCategory(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.category.setValue(value);
  }

  setServiceTypes(serviceIndex: number, value: string[]): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.type.setValue(value);
  }

  setServicePrice(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.price.setValue(value);
  }

  setServiceCurrency(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.currency.setValue(value);
  }

  setServiceDuration(serviceIndex: number, value: number | undefined): void {
    const services = this.commerceForm.controls.services;
    const service = services.at(serviceIndex);
    if (!service) return;

    const control = service.controls.duration;

    if (control.value === value) return;

    control.setValue(value);
  }

  setServicePrerequirement(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.prerequiredService.setValue(value);
  }

  clearServicePrerequirement(serviceIndex: number): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.prerequiredService.setValue(null);
  }

  setServiceDescription(serviceIndex: number, value: string): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    service.controls.description.setValue(value);
  }

  setServiceThumbnailImage(serviceIndex: number, thumbnail: File): void {
    const services = this.commerceForm.controls.services
    const service = services.at(serviceIndex);
    if(!service) return;
    
    service.controls.thumbnail.controls.url.setValue(URL.createObjectURL(thumbnail));
    service.controls.thumbnail.controls.file.setValue(thumbnail);
  }

  addServiceGalleryImage(serviceIndex: number, file: File): void {
    const service = this.servicesForm.at(serviceIndex);
    if(!service) return;
    service.controls.gallery.push(this.createGalleryImage(file));
  }

  removeServiceGalleryImage(serviceIndex: number, imageIndex: number): void {
    const service = this.servicesForm.at(serviceIndex);
    if(!service) return;
    service.controls.gallery.removeAt(imageIndex);
  }

  reorderServiceGalleryImages(serviceIndex: number, previousIndex: number, currentIndex: number) {
    const service = this.servicesForm.at(serviceIndex);
    if(!service) return;
    const gallery = service.get('gallery');
    if (!(gallery instanceof FormArray)) return;

    if ( previousIndex === currentIndex ||
        previousIndex < 0 || currentIndex < 0 ||
        previousIndex >= gallery.length || currentIndex >= gallery.length
    ) return;

    const copy = [...gallery.value];
    const [moved] = copy.splice(previousIndex, 1);
    copy.splice(currentIndex, 0, moved);
    gallery.setValue(copy);
  }
  

  /* ----------------------------------------------------------
  * Packages Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */

  private createPackage(): PackageForm {
    const country = this.locationValue().country;
    const currency = country ? ( COUNTRY_CURRENCY.get(country!) ?? '' ) : ''
    return new FormGroup({
      localID: new FormControl<string>(crypto.randomUUID(), {nonNullable: true}),
      id: new  FormControl<string>('', {nonNullable: true}),
      name: new FormControl<string>('', {nonNullable: true}),
      link: new FormControl<string>('', {nonNullable: true}),
      price: new FormControl<string>('', {nonNullable: true}),
      currency: new FormControl<string>(currency, {nonNullable: true}),
      duration: new FormControl<number | undefined>(undefined, {nonNullable: true}),
      services: new FormControl<string[]>([], {nonNullable: true}),
      description: new FormControl<string>('', {nonNullable: true})
    })
  }

  addPackage(): void {
    const packages = this.commerceForm.controls.packages
    packages.push(this.createPackage());
  }

  removePackage(packageIndex: number): void {
    const packages = this.commerceForm.controls.packages
    packages.removeAt(packageIndex);
  }

  setPackageName(packageIndex: number, value: string): void {
    const packages = this.commerceForm.controls.packages
    const pkg = packages.at(packageIndex);
    if(!pkg) return;
    pkg.controls.name.setValue(value);
  }

  setPackageLink(packageIndex: number, value: string): void {
    const packages = this.commerceForm.controls.packages
    const pkg = packages.at(packageIndex);
    if(!pkg) return;
    pkg.controls.link.setValue(value);
  }

  setPackagePrice(packageIndex: number, value: string): void {
    const packages = this.commerceForm.controls.packages
    const pkg = packages.at(packageIndex);
    if(!pkg) return;
    pkg.controls.price.setValue(value);
  }

  setPackageCurrency(packageIndex: number, value: string): void {
    const packages = this.commerceForm.controls.packages
    const pkg = packages.at(packageIndex);
    if(!pkg) return;
    pkg.controls.currency.setValue(value);
  }

  setPackageDuration(packageIndex: number, value: number | undefined): void {
    const packages = this.commerceForm.controls.packages;
    const pkg = packages.at(packageIndex);
    if (!pkg) return;

    const control = pkg.controls.duration;

    if (control.value === value) return;

    control.setValue(value);
  }

  setPackageDescription(packageIndex: number, value: string): void {
    const packages = this.commerceForm.controls.packages
    const pkg = packages.at(packageIndex);
    if(!pkg) return;
    pkg.controls.description.setValue(value);
  }

  setPackageServices(packageIndex: number, value: string[]): void {
    const packages = this.commerceForm.controls.packages
    const pkg = packages.at(packageIndex);
    if(!pkg) return;
    pkg.controls.services.setValue(value);
  }
  
  /* ----------------------------------------------------------
  * Discount Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */
  private createDiscount(): DiscountForm {
    return new FormGroup({
      localID: new FormControl<string>(crypto.randomUUID(), {nonNullable: true}),
      article: new FormControl<{id: string, type: 'service' | 'package'}>({id: '', type: 'service'}, {nonNullable: true}),
      percentage: new FormControl<number | undefined>(15, {nonNullable: true})
    })
  }

  addDiscount(): void {
    const discounts = this.discountsForm
    discounts.push(this.createDiscount());
  }

  removeDiscount(discountIndex: number): void {
    const discounts = this.discountsForm
    discounts.removeAt(discountIndex);
  }

  setDiscountArticle(discountIndex: number, articleID: string, type: 'service' | 'package'): void {
    const discount = this.discountsForm.at(discountIndex);
    if(!discount) return;
    discount.controls.article.setValue({id: articleID, type: type});
  }

  setDiscountPercentage(discountIndex: number, percentage: number | undefined): void {
    const discount = this.discountsForm.at(discountIndex);
    if(!discount) return;
    discount.controls.percentage.setValue(percentage);
  }

  /* ----------------------------------------------------------
  * Booking Rules Form Setters (Encapsulated Mutations)
  * ---------------------------------------------------------- */

  setBookingRulesEmailReminders(value: boolean): void {
    this.bookingRulesForm.controls.emailReminders.setValue(value);
  }

  setBookingRulesSMSReminders(value: boolean): void {
    this.bookingRulesForm.controls.smsReminders.setValue(value);
  }
  setBookingRulesVisible(value: boolean): void {
    this.bookingRulesForm.controls.visible.setValue(value);
  }
  
  setBookingRulesMinAhead(minutes: number | undefined): void {
    this.bookingRulesForm.controls.minAhead.setValue(minutes);
  }

  setBookingRulesMaxAhead(minutes: number | undefined): void {
    this.bookingRulesForm.controls.maxAhead.setValue(minutes);
  }

  /* ----------------------------------------------------------
  * Safe Bulk Operations
  * ---------------------------------------------------------- */

  reset(step?: string): void {
    if(!step){
      this.steps.forEach(step => step.reset());
    }
    else switch(step){
      case('profile'): this.profileStep.reset(); break;
      case('location'): this.locationStep.reset(); break;
      case('media'): this.mediaStep.reset(); break;
      case('schedule'): this.scheduleStep.reset(); break;
      case('exception'): this.exceptionsStep.reset(); break;
      case('commerce'): this.commerceStep.reset(); break;
      case('bookingRules'): this.bookingRulesStep.reset(); break;
    }
  }

  markAsSaved(step?: string): void {
    if(!step){
      this.steps.forEach(step => step.markAsSaved());
    }
    else switch(step){
      case('profile'): this.profileStep.markAsSaved(); break;
      case('location'): this.locationStep.markAsSaved(); break;
      case('media'): this.mediaStep.markAsSaved(); break;
      case('schedule'): this.scheduleStep.markAsSaved(); break;
      case('exception'): this.exceptionsStep.markAsSaved(); break;
      case('commerce'): this.commerceStep.markAsSaved(); break;
      case('categories'): this.categoriesStep.markAsSaved(); break;
      case('services'): this.servicesStep.markAsSaved(); break;
      case('packages'): this.packagesStep.markAsSaved(); break;
      case('discounts'): this.discountsStep.markAsSaved(); break;
      case('bookingRules'): this.bookingRulesStep.markAsSaved(); break;
    }
  }

  /* ---------------- Helper ---------------- */

  private hasUniqueLinks(): boolean {
    const serviceValues = Array.isArray(this.servicesForm?.value)
      ? this.servicesForm.value as { link: string }[]
      : [];

    const packageValues = Array.isArray(this.packagesForm?.value)
      ? this.packagesForm.value as { link: string }[]
      : [];

    const seen = new Set<string>();

    const allLinks = [
      ...serviceValues.map(s => s?.link),
      ...packageValues.map(p => p?.link)
    ];

    for (const link of allLinks) {
      if (!nonEmpty(link)) continue;

      if (seen.has(link)) {
        return false;
      }

      seen.add(link);
    }

    return true;
  }


  /* ---------------- Save Layer ---------------- */
  saveProfile(): Observable<RequestState<Studio>> {
    return this.saveResource(
      'studio',
      this.profileVm(),
      () => this.singleProvider.activeStudio() ?? null,
      this.mapProfileToStudio,
      [
        'name',
        'link',
        'type',
        'contactEmail',
        'contactPhone',
        'instagramLink',
        'facebookLink',
        'whatsAppPhone',
        'searchTags',
      ] as const
    );
  }

  saveLocation(): Observable<RequestState<Studio>> {
    return this.saveResource(
      'studio',
      this.locationVm(),
      () => this.singleProvider.activeStudio() ?? null,
      this.mapLocationToStudio,
      [
        'country',
        'city',
        'street',
        'buildingNumber',
        'apartmentNumber',
        'latitude',
        'longitude',
        'timeZone',
      ] as const
    );
  }

  saveMedia(): Observable<RequestState<Studio>> {
    const vm = this.mediaVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) return of({ status: 'idle' });

    const { thumbnail, heroImages } = vm.value as {
      thumbnail:  { url: string; file: File | null };
      heroImages: { url: string; file: File | null }[];
    };

    const formData = new FormData();

    // Thumbnail — append file if new, otherwise nothing (backend keeps existing)
    if (thumbnail.file instanceof File) {
      formData.append('thumbnail', thumbnail.file);
    }

    // Hero images — new files get appended at their slot index
    // Existing images are referenced by their DB row id
    const retainedImageIds: string[] = [];

    heroImages.forEach((img, i) => {
      if (img.file instanceof File) {
        formData.append(`heroImage_${i}`, img.file);
      } else {
        // Find the matching hero image in the current studio state by URL
        const existing = studio.heroImages.find(h => h.url === img.url);
        if (existing) {
          retainedImageIds.push(existing.id);
        }
      }
    });

    formData.append('retainedImageIds', JSON.stringify(retainedImageIds));

    return this.setter.updateStudioMedia(formData);
  }

  saveCategories(): Observable<RequestState<Category[]>> {
    const vm = this.categoriesVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) return of({ status: 'idle' });

    const current = studio.categories ?? [];
    const next    = this.mapCategoriesToEntities(vm.value, studio.id);
    const diff    = this.buildCategoryDiff(current, next);

    if (!diff.toInsert.length && !diff.toUpdate.length && !diff.toDelete.length) {
      return of({ status: 'idle' });
    }

    return this.setter.updateCategories(diff);
  }

  saveSchedules(): Observable<RequestState<WeeklySchedule[]>>{
    const vm = this.scheduleVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) return of({ status: 'idle' });

    const current = studio.weeklySchedules ?? [];
    const next    = this.mapSchedulesToEntities(vm.value, studio.id);
    const diff    = this.buildSchedulesDiff(current, next);

    if (!diff.toInsert.length && !diff.toUpdate.length && !diff.toDelete.length) {
      return of({ status: 'idle' });
    }

    return this.setter.updateSchedules(diff);
  }

  saveExceptions(): Observable<RequestState<ScheduleException[]>> {
    const vm = this.exceptionsVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) return of({ status: 'idle' });

    const current = studio.exceptions ?? [];
    const next    = this.mapExceptionsToEntities(vm.value, studio.id);
    const diff    = this.buildExceptionDiff(current, next);

    if (!diff.toInsert.length && !diff.toUpdate.length && !diff.toDelete.length) {
      return of({ status: 'idle' });
    }

    return this.setter.updateExceptions(diff);
  }

  saveServices(): Observable<RequestState<Service[]>> {
    const vm = this.servicesVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) {
      return of({ status: 'idle' });
    }
    const rawValue = vm.value as {
      localID:      string;
      id:           string;
      name:         string;
      link:         string;
      category:     string;
      serviceTypes: string[];
      price:        string;
      currency:     string;
      duration:     number;
      prerequiredService: string | null;
      description:  string;
      thumbnail:    { key: string, url: string; file: File | null };
      gallery:      { key: string, url: string; file: File | null; timestamp: number }[];
    }[];

    // Collect new files keyed by localID before mapping strips them
    const thumbnailFiles = new Map<string, File>();
    const galleryFiles   = new Map<string, File>(); // key: `${localID}_${timestamp}`

    rawValue.forEach(s => {
      if (s.thumbnail.file instanceof File) {
        thumbnailFiles.set(s.localID, s.thumbnail.file);
      }
      s.gallery.forEach(g => {
        if (g.file instanceof File) {
          galleryFiles.set(`${s.localID}_${g.timestamp}`, g.file);
        }
      });
    });
    
    const current = this.singleProvider.activeStudioServices() ?? [];
    const next    = this.mapServicesToEntities(rawValue, studio.id);
    const diff    = this.buildServiceDiff(current, next);

    const hasFileChanges = (s: Service) =>
      thumbnailFiles.has(s.localID) ||
      s.gallery.some(g => galleryFiles.has(`${s.localID}_${g.timestamp}`));

    // Re-check: services only in toUpdate due to file change but no data change
    // are already captured — buildServiceDiff now ignores files so toUpdate is clean

    if (!diff.toInsert.length && !diff.toUpdate.length && !diff.toDelete.length
      && thumbnailFiles.size === 0 && galleryFiles.size === 0) {
      return of({ status: 'idle' });
    }

    // Add services that only have file changes (not caught by data diff)
    const toUpdateIds = new Set(diff.toUpdate.map(s => s.id));
    const fileOnlyUpdates = next.filter(s =>
      s.id &&
      !toUpdateIds.has(s.id) &&
      hasFileChanges(s)
    );

    const finalDiff: ServiceDiff = {
      toInsert: diff.toInsert,
      toUpdate: [...diff.toUpdate, ...fileOnlyUpdates],
      toDelete: diff.toDelete,
    };

    if (!finalDiff.toInsert.length && !finalDiff.toUpdate.length && !finalDiff.toDelete.length) {
      return of({ status: 'idle' });
    }

    const formData = new FormData();

    // Serialize diff — no File objects
    const diffForTransport = {
      toDelete: finalDiff.toDelete,
      toInsert: finalDiff.toInsert.map(s => ({
        ...s,
        thumbnail: { key: '' },
        gallery:   s.gallery.map(g => ({ key: '', timestamp: g.timestamp }))
      })),
      toUpdate: finalDiff.toUpdate.map(s => ({
        ...s,
        thumbnail: { key: s.thumbnail.url ? this.extractKey(s.thumbnail.url) : '' },
        gallery:   s.gallery.map(g => ({ key: g.url ? this.extractKey(g.url) : '', timestamp: g.timestamp }))
      })),
    };

    formData.append('diff', JSON.stringify(diffForTransport));

    // Append files using localID as the identifier
    thumbnailFiles.forEach((file, localID) => {
      formData.append(`thumbnail_${localID}`, file);
    });

    galleryFiles.forEach((file, compositeKey) => {
      formData.append(`gallery_${compositeKey}`, file);
    });

    return this.setter.updateServices(formData);
  }

  private extractKey(url: string): string {
    return url.split('/').pop() ?? '';
  }

  savePackages(): Observable<RequestState<Package[]>> {
    const vm = this.packagesVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) return of({ status: 'idle' });

    const current = this.singleProvider.activeStudioPackages() ?? [];
    const next    = this.mapPackagesToEntities(vm.value, studio.id);
    const diff    = this.buildPackageDiff(current, next);

    if (!diff.toInsert.length && !diff.toUpdate.length && !diff.toDelete.length) {
      return of({ status: 'idle' });
    }

    return this.setter.updatePackages(diff);
  }

  saveDiscounts(): Observable<RequestState<Discount[]>> {
    const vm = this.discountsVm();

    if (!vm.hasUnsaved || vm.state === 'invalid') {
      return of({ status: 'idle' });
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of({ status: 'idle' });
    }

    const studio = this.singleProvider.activeStudio();
    if (!studio) return of({ status: 'idle' });

    const current: Discount[] = [
      ...this.singleProvider.activeStudioPackages()
        .filter(i => i.discount > 0)
        .map(i => ({
          localID: '', 
          article: { id: i.id, type: 'package' }, 
          percentage: i.discount
        } as Discount)), 
      ...this.singleProvider.activeStudioServices()
        .filter(i => i.discount > 0)
        .map(i => ({
          localID: '', 
          article: { id: i.id, type: 'service' }, 
          percentage: i.discount
        } as Discount)), 
    ];

    const next    = this.mapDiscountsToEntities(vm.value, studio.id);
    const diff    = this.buildDiscountDiff(current, next);

    if (!diff.toInsert.length && !diff.toUpdate.length && !diff.toDelete.length) {
      return of({ status: 'idle' });
    }

    return this.setter.updateDiscounts(diff);
  }


  saveBookingRules(): Observable<RequestState<Studio>> {
    return this.saveResource(
      'studio',
      this.bookingRulesVm(),
      () => this.singleProvider.activeStudio() ?? null,
      this.mapBookingRulesToStudio,
      [
        'emailReminders',
        'smsReminders',
        'visible',
        'minScheduleAhead',
        'maxScheduleAhead'
      ] as const
    );
  }

  publish(): Observable<RequestState<Studio>> {
    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of(this.setter.idleState<'studio'>());
    }

    const current = this.singleProvider.activeStudio();
    if(!current){
      return of(this.setter.idleState<'studio'>());
    }

    if(this.setupState() !== 'empty'){
      return of(this.setter.idleState<'studio'>());
    }

    return this.setter.update('studio', { id: current.id, published: true });
  }


  /* ---------------- Mapping Layer ---------------- */

  private mapProfileToStudio(
    value: ReturnType<typeof this.profileValue>
  ): Partial<Studio> {
    return {
      name: value.studioName,
      link: value.studioLink,
      type: value.studioTypes,
      contactEmail: value.contactEmail,
      contactPhone: value.contactPhone,
      instagramLink: value.instagram,
      facebookLink: value.facebook,
      whatsAppPhone: value.whatsappPhone,
      searchTags: value.searchTags
    };
  }
  private mapLocationToStudio(
    value: ReturnType<typeof this.locationValue>
  ): Partial<Studio> {
      return {
        country: value.country,
        city: value.city,
        street: value.street,
        buildingNumber: value.buildingNumber,
        apartmentNumber: value.apartmentNumber,
        latitude: value.latitude,
        longitude: value.longitude,
        timeZone: value.country ? COUNTRY_TIME_ZONE.get(value.country) : undefined,
      };
  }

  private mapCategoriesToEntities(
    value: Partial<{ localID: string; id: string; name: string }>[],
    studioId: string
  ): Category[] {
    return value
      .filter((c): c is { localID: string; id: string; name: string } =>
        !!c.name?.trim()
      )
      .map((c, i) => ({
        id:           c.id ?? '',
        localID:      c.localID ?? '',
        name:         c.name.trim(),
        displayOrder: i,
        services:     [],
        studio:       studioId,
      }));
  }

  private mapExceptionsToEntities(
    value: Partial<{
      exceptions: Partial<{
        localID: string;
        id: string;
        label: string;
        type: 'oneOff' | 'range' | 'annual';
        appliesTo: any;
        isClosed: boolean;
        intervals: Partial<{ start: string; end: string }>[];
      }>[];
    }>,
    studioId: string
  ): ScheduleException[] {
    return (value.exceptions ?? [])
      .filter((e): e is {
        localID: string;
        id: string;
        label: string;
        type: 'oneOff' | 'range' | 'annual';
        appliesTo: any;
        isClosed: boolean;
        intervals: { start: string; end: string }[];
      } => !!e && !!e.type && !!e.appliesTo)
      .map(e => ({
        id:        e.id ?? '',
        label:     e.label?.trim() ?? '',
        type:      e.type,
        isClosed: e.isClosed ?? false,
        appliesTo: e.type === 'oneOff'
          ? { type: 'oneOff' as const, date: e.appliesTo.date }
          : e.type === 'range'
          ? { type: 'range' as const, startDate: e.appliesTo.startDate, endDate: e.appliesTo.endDate }
          : { type: 'annual' as const, month: e.appliesTo.month, day: e.appliesTo.day },
        intervals: (e.intervals ?? []).filter(
          (i): i is { start: string; end: string } => !!i.start && !!i.end
        ),
        studio: studioId,
      }));
  }
    
  private mapSchedulesToEntities(
    value: Partial<{
      schedules: Partial<{
        localID: string;
        id: string;
        effectiveFrom: string | null;
        effectiveTo:   string | null;
        days: Partial<{
          day:       string;
          open:      boolean;
          intervals: Partial<{ start: string; end: string }>[];
        }>[];
      }>[];
    }>,
    studioId: string
  ): WeeklySchedule[] {
    return (value.schedules ?? [])
      .filter((s): s is {
        localID: string;
        id: string;
        effectiveFrom: string | null;
        effectiveTo:   string | null;
        days: {
          day:       string;
          open:      boolean;
          intervals: { start: string; end: string }[];
        }[];
      } => !!s && Array.isArray(s.days))
      .map(s => ({
        id:            s.id ?? '',
        effectiveFrom: s.effectiveFrom ?? null,
        effectiveTo:   s.effectiveTo   ?? null,
        studio:        studioId,
        days: (s.days ?? [])
          .filter((d): d is {
            day:       string;
            open:      boolean;
            intervals: { start: string; end: string }[];
          } => !!d && !!d.day && DAY_OF_WEEK[d.day] != null)
          .map(d => ({
            id:        '',
            dayOfWeek: DAY_OF_WEEK[d.day]!,
            isClosed:  !d.open,
            intervals: (d.intervals ?? []).filter(
              (i): i is { start: string; end: string } => !!i?.start && !!i?.end
            ),
          })),
      }));
  }

  private mapServicesToEntities(
    value: Partial<{
      localID:            string;
      id:                 string;
      name:               string;
      link:               string;
      category:           string;
      type:               string[];
      price:              string;
      currency:           string;
      duration:           number | undefined;
      prerequiredService: string | null;
      description:        string;
      thumbnail:          Partial<{ id: string, url: string; file: File | null }>;
      gallery:            Partial<{ id: string, key: string, url: string; file: File | null; timestamp: number }>[];
    }>[],
    studioId: string
  ): Service[] {
    return (value ?? [])
      .filter((s): s is {
        localID:            string;
        id:                 string;
        name:               string;
        link:               string;
        category:           string;
        type:               string[];
        price:              string;
        currency:           string;
        duration:           number;
        prerequiredService: string | null;
        description:        string;
        thumbnail:          Partial<{ id: string, key: string, url: string; file: File | null }>;
        gallery:            Partial<{ id: string, key: string, url: string; file: File | null; timestamp: number }>[];
      } => !!s && !!s.name && !!s.link && !!s.price && !!s.currency && !!s.category && Number.isFinite(s.duration))
      .map(s => ({
        localID:            s.localID,
        id:                 s.id              ?? '',
        name:               s.name.trim(),
        link:               s.link.trim(),
        price:              s.price,
        currency:           s.currency,
        discount:           0,
        duration:           s.duration,
        description:        s.description     ?? '',
        thumbnail:          { id: s.thumbnail?.id ?? '', key: s.thumbnail.key ?? '', url: s.thumbnail?.url ?? '', file: null },
        gallery:            (s.gallery ?? [])
                              .filter((g): g is { id: string, key: string, url: string; file: File | null; timestamp: number } =>
                                !!g.url && Number.isFinite(g.timestamp)
                              )
                              .map(g => ({ id: g.id,  key: g.key, url: g.url, file: g.file, timestamp: g.timestamp })),
        isReservable:       true,
        addons:             [],
        prerequiredService: s.prerequiredService ?? '',
        type:               s.type      ?? [],
        packages:           [],
        studio:             studioId,
        category:           s.category,
      }));
  }

  private mapPackagesToEntities(
    value: Partial<{
      localID:        string;
      id:             string;
      name:           string;
      link:           string;
      price:          string;
      currency:       string;
      discount:       number;
      duration:       number;
      description:    string;
      isReservable:   boolean;
      prerequiredService: string;
      services:       string[];
      addons: Partial<{
        id:            string;
        name:          string;
        price:         number;
        durationDelta: number;
        group:         string;
        isExclusive:   boolean;
      }>[];
    }>[],
    studioId: string
  ): Package[] {
    return (value ?? [])
      .filter((p): p is {
        localID:        string;
        id:             string;
        name:           string;
        link:           string;
        price:          string;
        currency:       string;
        discount:       number;
        duration:       number;
        description:    string;
        isReservable:   boolean;
        prerequiredService: string;
        services:       string[];
        addons: {
          id:            string;
          name:          string;
          price:         number;
          durationDelta: number;
          group:         string;
          isExclusive:   boolean;
        }[];
      } => !!p && !!p.name && !!p.link && !!p.price && !!p.currency)
      .map(p => ({
        localID:        p.id             ?? '',
        id:             p.id             ?? '',
        name:           p.name.trim(),
        link:           p.link.trim(),
        price:          p.price,
        currency:       p.currency,
        discount:       p.discount       ?? 0,
        duration:       p.duration,
        description:    p.description    ?? '',
        isReservable:   p.isReservable   ?? true,
        prerequiredService: p.prerequiredService ?? '',
        services:       p.services       ?? [],
        addons:         (p.addons ?? [])
          .filter((a): a is {
            id:            string;
            name:          string;
            price:         number;
            durationDelta: number;
            group:         string;
            isExclusive:   boolean;
          } => !!a && !!a.name)
          .map(a => ({
            id:            a.id            ?? '',
            name:          a.name.trim(),
            price:         a.price         ?? 0,
            durationDelta: a.durationDelta ?? 0,
            group:         a.group         ?? '',
            isExclusive:   a.isExclusive   ?? false,
          })),
        studio: studioId,
      }));
  }

  private mapDiscountsToEntities(
    value: Partial<{
      localID:        string;
      id:             string;
      article:        { type: 'service' | 'package', id: string },
      percentage:     number | null,
    }>[],
    studioId: string
  ): Discount[] {
    return (value ?? [])
      .filter((p): p is {
        localID:        string;
        id:             string;
        article:        { type: 'service' | 'package', id: string};
        percentage:     number | null;
      } => !!p && !!p.article )
      .map(p => ({
        localID:        p.localID             ?? '',
        id:             p.localID             ?? '',
        article:        { id: p.article.id, type: p.article.type },
        percentage:     p.percentage,
        studio: studioId,
      }));
  }

  private mapBookingRulesToStudio(
    value: ReturnType<typeof this.bookingRulesValue>
  ): Partial<Studio> {
    return {
        emailReminders: value.emailReminders,
        smsReminders: value.smsReminders,
        visible: value.visible,
        minScheduleAhead: value.minAhead,
        maxScheduleAhead: value.maxAhead,
    };
  }

  /* ---------------- Diff Layer ---------------- */
  private saveResource<K extends ResourceKey, F>(
    resource: K,
    vm: {
      form: { valid: boolean };
      value: F;
      state: SetupStepState;
      hasUnsaved: boolean;
    },
    getCurrent: () => Entity<K> | null,
    mapFormToEntity: (value: F) => Partial<Entity<K>>,
    updatableFields: readonly (keyof Entity<K>)[]
  ): Observable<RequestState<Entity<K>>> {

    if (!vm.hasUnsaved || vm.state === "invalid") {
      return of(this.setter.idleState<K>());
    }

    const selected = this.singleProvider.selected();
    if (!selected || !isOwner(selected)) {
      return of(this.setter.idleState<K>());
    }

    const current = getCurrent();
    if (!current) {
      return of(this.setter.idleState<K>());
    }

    const mapped = mapFormToEntity(vm.value);
    const payload = this.buildUpdatePayload(current, mapped, updatableFields);

    if (Object.keys(payload).length === 1) {
      return of(this.setter.idleState<K>());
    }

    const serializedPayload = this.serializePayload(resource, payload);

    return this.setter.update(resource, serializedPayload);
  }

  private buildCategoryDiff(
    current: Category[],
    next: Category[]
  ): { toInsert: Category[]; toUpdate: Category[]; toDelete: string[] } {

    const currentMap = new Map(current.map(c => [c.id, c]));
    const nextMap    = new Map(next.filter(c => c.id).map(c => [c.id, c]));

    const toInsert = next.filter(c => !c.id);
    const toDelete = current
      .filter(c => !nextMap.has(c.id))
      .map(c => c.id);
    const toUpdate = next.filter(c => {
      if (!c.id) return false;
      const existing = currentMap.get(c.id);
      return existing && !deepEqual(existing, c);
    });

    return { toInsert, toUpdate, toDelete };
  }

  private buildSchedulesDiff(
    current: WeeklySchedule[],
    next: WeeklySchedule[]
  ): ScheduleDiff {
    const currentMap = new Map(current.map(s => [s.id, s]));
    const nextMap    = new Map(next.filter(s => s.id).map(s => [s.id, s]));

    const toInsert = next.filter(s => !s.id);
    const toDelete = current
      .filter(s => !nextMap.has(s.id))
      .map(s => s.id);
    const toUpdate = next.filter(s => {
      if (!s.id) return false;
      const existing = currentMap.get(s.id);
      return existing && !deepEqual(existing, s);
    });

    return { toInsert, toUpdate, toDelete };
  }

  private buildExceptionDiff(
    current: ScheduleException[],
    next: ScheduleException[]
  ): ExceptionDiff {
    const currentMap = new Map(current.map(e => [e.id, e]));
    const nextMap    = new Map(next.filter(e => e.id).map(e => [e.id, e]));

    const toInsert = next.filter(e => !e.id);
    const toDelete = current
      .filter(e => !nextMap.has(e.id))
      .map(e => e.id);
    const toUpdate = next.filter(e => {
      if (!e.id) return false;
      const existing = currentMap.get(e.id);
      return existing && !deepEqual(existing, e);
    });

    return { toInsert, toUpdate, toDelete };
  }

  private buildServiceDiff(
    current: Service[],
    next:    Service[]
  ): ServiceDiff {
    const currentMap = new Map(current.map(s => [s.id, s]));
    const nextMap    = new Map(next.filter(s => s.id).map(s => [s.id, s]));

    const toInsert = next.filter(s => !s.id);
    const toDelete = current
      .filter(s => !nextMap.has(s.id))
      .map(s => s.id);

    const toUpdate = next.filter(s => {
      if (!s.id) return false;
      const existing = currentMap.get(s.id);
      if (!existing) return false;
      return !deepEqual(this.stripFiles(existing), this.stripFiles(s));
    });

    return { toInsert, toUpdate, toDelete };
  }

  private stripFiles(s: Service): Omit<Service, 'thumbnail' | 'gallery'> & {
    thumbnail: { url: string };
    gallery:   { url: string; timestamp: number }[];
  } {
    return {
      ...s,
      thumbnail: { url: s.thumbnail.url },
      gallery:   s.gallery.map(g => ({ url: g.url, timestamp: g.timestamp })),
    };
  }


  private buildPackageDiff(
    current: Package[],
    next:    Package[]
  ): PackageDiff {
    const currentMap = new Map(current.map(p => [p.id, p]));
    const nextMap    = new Map(next.filter(p => p.id).map(p => [p.id, p]));

    const toInsert = next.filter(p => !p.id);
    const toDelete = current
      .filter(p => !nextMap.has(p.id))
      .map(p => p.id);
    const toUpdate = next.filter(p => {
      if (!p.id) return false;
      const existing = currentMap.get(p.id);
      return existing && !deepEqual(existing, p);
    });

    return { toInsert, toUpdate, toDelete };
  }

  private buildDiscountDiff(
    current: Discount[],
    next:    Discount[]
  ): DiscountsDiff {
    const currentMap = new Map(current.map(d => [d.article.id, d]));
    const nextMap    = new Map(next.map(d => [d.article.id, d]));

    const toInsert = next.filter(d => !currentMap.has(d.article.id));
    const toDelete = current
      .filter(d => !nextMap.has(d.article.id))
      .map(d => d.article.id);
    const toUpdate = next.filter(d => {
      const existing = currentMap.get(d.article.id);
      return existing && !deepEqual(existing, d);
    });

    return { toInsert, toUpdate, toDelete };
  }
  // -- SERIALIZE --

  private serializePayload<K extends ResourceKey>(
    resource: K,
    payload: Partial<Entity<K>> & { id: string }
  ): Partial<Entity<K>> & { id: string } {

    if (resource === 'studio'){
      const studioPayload = payload as unknown as Partial<Studio> & { id: string };

      if (Array.isArray(studioPayload.searchTags)) {
        studioPayload.searchTags = JSON.stringify(studioPayload.searchTags) as unknown as string[];
      }

      if (Array.isArray(studioPayload.type)) {
        studioPayload.type = JSON.stringify(studioPayload.type) as unknown as string[];
      }
    }
    
    return payload;
  }

  private buildUpdatePayload<T extends { id: string }>(
    current: T, next: Partial<T>, fields: readonly (keyof T)[]
  ): Partial<T> & { id: T["id"] } {

    const payload: Partial<T> = {};

    for (const key of fields) {
      this.assignIfChanged(payload, current, next, key);
    }

    return { ...payload, id: current.id };
  }

  private assignIfChanged< T extends { id: string }, K extends keyof T >(
    payload: Partial<T>, current: T, next: Partial<T>, key: K
  ): void {
    if (key === 'id') return;

    const currentValue = current[key];
    const nextValue = next[key];

    if (!deepEqual(currentValue, nextValue)) {
      payload[key] = nextValue as T[K];
    }
  }
}
