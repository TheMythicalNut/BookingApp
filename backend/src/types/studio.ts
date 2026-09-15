import type { ScheduleException, TimeInterval } from "./exception.js"
import type { WeeklySchedule } from "./schedule.js"

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
  country: string
  city: string
  street: string
  buildingNumber: string
  apartmentNumber: string
  latitude: number
  longitude: number
  timeZone: string // (e.g. "Europe/Belgrade"). - all available time zones: https://data.iana.org/time-zones/tzdb/zone1970.tab
  minScheduleAhead?: number // minutes, if not available defaults to 1 day
  maxScheduleAhead?: number // minutes, if not available defaults to 30 days
  searchTags: string[]
  thumbnail: string
  heroImages: string[]
  emailReminders: boolean
  smsReminders: boolean
  weeklySchedules: WeeklySchedule[]
  exceptions: ScheduleException[]
  available: Available[]    // generate available time slots for the "now() + min_chedule_ahead - now() + max_schedule_ahead period" on weeklySchedules and exceptions and reservations
  owner: string,            // OWNER id
  services: string[]        // SERVICE ids
  categories: Category[]
  packages: string[]        // PACKAGE ids
}


export interface Available {
  date: string // ISO-8601 date (YYYY-MM-DD)
  intervals: TimeInterval[]
}


export type CategoryDiff = {
  toInsert: Category[];
  toUpdate: Category[];
  toDelete: string[];
};

export interface Category {
  id: string,
  name: string,
  displayOrder: number,
  services: string[], // SERVICE ids
  studio: string
}

export type CategoryDB = {
  id:            string;
  studio_id:     string;
  name:          string;
  display_order: number;
  created_at:    Date;
  updated_at:    Date;
  services:      string[] | null;
};

export enum DayOfWeek {
  Monday = 1, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
}


export interface StudioDB {
  id: string
  name: string
  score: number
  type: string // JSON-encoded array of strings

  link: string
  instagram_link: string | null
  facebook_link: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp_phone: string | null

  country: string
  city: string
  street: string
  building_number: string
  apartment_number: string

  latitude: number
  longitude: number

  time_zone: string

  min_schedule_ahead: number
  max_schedule_ahead: number

  thumbnail: string | null

  search_tags: string // JSON-encoded array of strings

  email_reminders: boolean
  sms_reminders: boolean

  created_at: Date
  updated_at: Date
}

export interface StudioOptions {
  search?: string,
  studioType?: string,
  amount?: number,  // might return less than amount if the amount of results is insufficient
  include: string[] // ids forcefully included as results
  exclude: string[] // ids forcefully excluded from potential results
}

export type Discount = {
  localID: string,
  id: string,
  article: { id: string; type: "service" | "package"; },
  percentage: number | null,
  studio?: string
}

export interface DiscountsDiff {
  toInsert: Discount[];
  toUpdate: Discount[];
  toDelete: string[];
}
