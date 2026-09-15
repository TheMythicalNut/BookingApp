export interface UserIdentity {
  email?: string;
  phone?: string;
  language?: string;
}

export type SetupState = 'INTRO' | 'PROFILE' | 'LOCATION' | 'MEDIA' | 'SCHEDULE' | 'EXCEPTIONS' | 'CATEGORIES' | 'SERVICES' | 'PACKAGES' | 'DISCOUNTS' | 'BOOKING_RULES' | 'PUBLISH' | 'COMPLETED' | 'DASHBOARD';
export type DashboardState = 'MAIN' | 'SCHEDULE' | 'RESERVATIONS' | 'RATINGS' | 'CLIENTS' | 'STATISTICS' | 'SETUP';

export interface Owner{
    id: string,
    firstName: string,
    lastName: string,

    email: string,
    password: string,
    newPassword: string,
    
    creditCardNumber: string,
    cvc: string,
    expirationDate: string,

    setupState: SetupState, // 'INIT' 'STEP_1' 'STEP_2' ... 'STEP_X' ... 'COMPLETED'
    
    studio: string, // STUDIO - foreign key
    status: string,
}

export interface Available {
  date: string // ISO-8601 date (YYYY-MM-DD)
  intervals: TimeInterval[]
}

export interface Studio {
  id: string
  name: string
  score: number
  link: string
  type: string[]


  instagramLink: string
  facebookLink: string
  contactEmail: string
  contactPhone: string
  whatsAppPhone: string
  searchTags: string[]

  country: string
  city: string
  street: string
  buildingNumber: string
  apartmentNumber: string
  latitude: number
  longitude: number
  timeZone: string // (e.g. "Europe/Belgrade"). - all available time zones: https://data.iana.org/time-zones/tzdb/zone1970.tab
  
  // booking constraints
  emailReminders: boolean
  smsReminders: boolean
  visible: boolean
  minScheduleAhead?: number // minutes, if not available defaults to 1 day
  maxScheduleAhead?: number // minutes, if not available defaults to 30 days

  thumbnail: string
  heroImages: HeroImage[]

  weeklySchedules: WeeklySchedule[]
  exceptions: ScheduleException[]
  available: Available[]

  published: boolean

  owner: string,            // OWNER id
  services: string[]        // SERVICE ids
  categories: Category[]
  packages: string[]        // PACKAGE ids
}

export type HeroImage = {
  id: string;
  key: string;
  url:  string;
  displayOrder: number;
}

export type Discount = {
  localID: string,
  id: string,
  article: { id: string; type: "service" | "package"; },
  percentage: number | null,
  studio?: string
}

export interface Category {
  id: string,
  localID: string;
  name: string,
  services: string[] // SERVICE ids
  displayOrder: number;
  studio: string;
}

export interface WeeklySchedule {
  id: string

  /**
   * Optional effective period for this schedule.
   * If omitted, the schedule is considered always active.
   */
  effectiveFrom: string | null // ISO-8601 date (YYYY-MM-DD)
  effectiveTo: string | null   // ISO-8601 date (YYYY-MM-DD)

  /**
   * Day-based working rules.
   */
  days: DaySchedule[]
}

export interface DaySchedule {
  dayOfWeek: DayOfWeek

  /**
   * If true, the studio is closed for the entire day.
   */
  isClosed: boolean

  /**
   * One or more working intervals.
   * Empty when isClosed = true.
   */
  intervals?: TimeInterval[]
}

export interface TimeInterval {
  start: string // Local time in 24h format (HH:mm)
  end: string // Local time in 24h format (HH:mm)
}

export enum DayOfWeek {
  Monday = 1, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
}

export interface ScheduleException {
  id: string
  label: string // Optional human-readable label (e.g. "Public holiday", "Renovation"). 

  /**
   * Defines when the exception applies.
   */
  appliesTo: ExceptionDateRule

  /**
   * If true, the studio is closed for the entire applicable period.
   */
  isClosed: boolean

  /**
   * Optional partial-day availability override.
   * Ignored if isClosed = true.
   */
  intervals?: TimeInterval[]
}

export type ExceptionDateRule =
  | OneOffDate
  | DateRange
  | AnnualRecurringDate

export interface OneOffDate {
  type: "oneOff"
  date: string // ISO-8601 date (YYYY-MM-DD)
}

export interface DateRange {
  type: "range"
  startDate: string // ISO-8601 date (YYYY-MM-DD)
  endDate: string   // ISO-8601 date (YYYY-MM-DD), inclusive
}

export interface AnnualRecurringDate {
  type: "annual"
  month: number // 1–12
  day: number   // 1–31 (validated by consumer)
}

export interface Location{
  city: string,
  country: string,
  latitude: number,
  longitude: number
}

export interface Addon {
  id: string;
  name: string;
  price: number; // 0 is free
  durationDelta: number,
  group: string;
  isExclusive: boolean;
}

export interface Service{
    localID: string,
    id: string,
    name: string,
    link: string,
    price: string,
    currency: string,
    discount: number,
    duration: number, // minutes
    description: string,
    thumbnail: { id: string, key: string, url: string, file: File | null },
    gallery: TimestampedImage[],
    isReservable: boolean,
    addons: Addon[];

    prerequiredService: string, // SERVICE - foreign key
    type: string[], // SERVICE_TYPE - foreign keys
    packages:  string[], // PACKAGE - foreign keys
    studio: string, // STUDIO - foreign key
    category: string // FROM STUDIO
}

export interface TimestampedImage{
  id: string,
  url: string,
  key: string,
  timestamp: number,
  file: File | null,
}

export interface Package{
    localID: string,
    id: string,
    name: string,
    link: string,
    price: string,
    currency: string,
    discount: number,
    duration: number, // minutes
    description: string,
    isReservable: boolean,
    addons: Addon[];

    prerequiredService: string,
    services: string[],
    studio: string,
}

export type ReservationStatus = {
  status: reservation_status,
  comment?: string
}

export type ReservationRating = {
  rating: number,
  comment?: string,
}

export type timeslot = {
  date: string // ISO-8601 date (YYYY-MM-DD)
  start: string // Local time in 24h format (HH:mm)
  end?: string // Local time in 24h format (HH:mm) or ''
}

export interface Reservation{
  id: string,
  studioName: string,
  categoryName: string,
  articleName: string,
  articleType: string[],

  price: string,
  currency: string,
  discount: number,
  duration: number,
  timeslot: timeslot,
  contactPhone: string,

  country: string
  city: string
  address: string
  latitude: number
  longitude: number
  timeZone: string // (e.g. "Europe/Belgrade"). - all available time zones: https://data.iana.org/time-zones/tzdb/zone1970.tab

  status: ReservationStatus,

  termChangeCount: number,

  userEmail: string,
  userPhone: string,
  additionalNote: string,
  rating?: ReservationRating,

  timestamp: string,
  addons: Addon[];

  user: string, // USER - foreign key
  studio: string,  // STUDIO - foreign key
  service: string,  // SERVICE - foreign key
  package: string,  // PACKAGE - foreign key
}
export type reservation_status = 'PENDING_CONFIRMATION' | 'CONFIRMATION_EXPIRED' | 'CONFIRMED' | 'USER_CANCELLED' | 'USER_LATE_CANCELLED' | 'OWNER_CANCELLED' | 'OWNER_LATE_CANCELLED' | 'COMPLETED' | 'MISSED';

export interface timerange { 
  startDate: Date; 
  endDate: Date;
  start: string;
  end: string;
 }

export type pages = 'login' | 'register' | 'mystudio';

 export interface Filters {
  search?: string
  studioType?: string
  location?: Location
  timeslot?: timerange
  serviceType?: string
  timestamp?: number
 }

 export interface LoadStudioOptions {
  search?: string,
  studioType?: string,
  amount?: number,  // might return less than amount if the amount of results is insufficient
  include: string[] // ids forcefully included as results
  exclude: string[] // ids forcefully excluded from potential results
 }

 export interface LoadServiceOptions {
  location?: Location,
  timeslot?: timerange,
  serviceType?: string,
  amount?: number,  // might return less than amount if the amount of results is insufficient
  include: string[] // ids forcefully included as results
  exclude: string[] // ids forcefully excluded from potential results
 }

 export interface LoadPackageOptions {
  location?: Location,
  timeslot?: timerange,
  serviceType?: string,
  amount?: number,  // might return less than amount if the amount of results is insufficient
  include: string[] // ids forcefully included as results
  exclude: string[] // ids forcefully excluded from potential results
 }

 export interface LoadReservationOptions {
  studio? : string, // by studio id
  service? : string, // by service id
  package?: string, // by package id
  articleType?: string[],  // by type id
  reservation?: string,  // by id
  timeslot?: timerange,  // by timeslot occurance id
  reservationTime: timerange, // by when it was reserved
  location?: Location, // by location
 }

export interface LoadOwnerOptions {
  studio? : string, // by studio id
  service? : string, // by service id
  package?: string, // by package id
  reservation?: string, // by reservation id
  location?: Location, // by location
  owner?: string, // by owner id
  token?: string, // by session token
 }

export type Article = (Service | Package);
export type Binary = 0 | 1;
export type HomeTopbarState = 'modal' | 'menu' | 'none';
export type FiltersExpandedState = Record<Binary, boolean>;


export function isStudio(e: Studio | Service | Package | Reservation | Owner): e is Studio { return 'owner' in e; }
export function isService(e: Studio | Service | Package | Reservation | Owner): e is Service { return 'prerequiredService' in e && 'packages' in e; }
export function isPackage(e: Studio | Service | Package | Reservation | Owner): e is Package { return 'services' in e && 'price' in e; }
export function isReservation(e: Studio | Service | Package | Reservation | Owner): e is Reservation { return 'user' in e }
export function isOwner(e: Studio | Service | Package | Reservation | Owner): e is Owner { return 'firstName' in e && 'lastName' in e }

export type RequestState<T> =
| { status: 'idle' }
| { status: 'loading' }
| { status: 'success'; data: T }
| { status: 'error'; error: unknown };

export interface EntityWithId {
  id: string;
}