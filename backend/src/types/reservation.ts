import type { Location } from "./location.js";
import type { Addon } from "./services.js";
import type { timerange } from "./util.js";

export type reservation_status =
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMATION_EXPIRED'
  | 'CONFIRMED'
  | 'USER_LATE_CANCELLED'
  | 'USER_CANCELLED'
  | 'OWNER_LATE_CANCELLED'
  | 'OWNER_CANCELLED'
  | 'COMPLETED'
  | 'MISSED';

export type ReservationStatus = {
  status:   reservation_status;
  comment?: string;
};

export type ReservationRating = {
  rating:   number;
  comment?: string;
};

export type Timeslot = {
  date:  string;  // ISO-8601 date (YYYY-MM-DD)
  start: string;  // HH:mm
  end?:  string;  // HH:mm
};

export interface Reservation {
  id:             string;

  // Snapshot display fields (joined at query time, not stored in reservations table)
  studioName:     string;
  categoryName:   string;
  articleName:    string;
  articleType:    string[];
  userEmail:      string;
  userPhone:      string;

  // Snapshot fields (immutable at booking time)
  price:          string;
  currency:       string;
  discount:       number;
  duration:       number;   // minutes

  timeslot:       Timeslot;
  contactPhone:   string;
  additionalNote: string;

  // Location snapshot
  country:        string;
  city:           string;
  address:        string;
  latitude:       number;
  longitude:      number;
  timeZone:       string;

  // Lifecycle
  status:          ReservationStatus;
  termChangeCount: number;
  timestamp:       string;  // ISO-8601 datetime (created_at)

  // Relations
  user:    string;           // user_id
  studio:  string;           // studio_id
  service: string | null;    // service_id — null when package is set
  package: string | null;    // package_id — null when service is set

  addons:  Addon[];
  rating?: ReservationRating;
}

export interface ReservationDB {
  id:               string;
  user_id:          string;
  studio_id:        string;
  service_id:       string | null;
  package_id:       string | null;

  price:            number;
  currency:         string;
  discount:         number;
  duration_minutes: number;

  contact_phone:    string;
  additional_note:  string | null;

  country:          string;
  city:             string;
  address:          string;
  latitude:         number;
  longitude:        number;
  time_zone:        string;

  status:           reservation_status;
  status_comment:   string | null;
  term_change_count: number;

  created_at:       Date;
  updated_at:       Date;

  // Joined fields
  reservation_date: string;        // DATE → string via pg type parser
  start_time:       string;        // TIME → HH:mm
  end_time:         string | null; // TIME → HH:mm

  // Aggregated
  addons:           ReservationAddonDB[];
  rating:           ReservationRatingDB | null;

  // Snapshot joins
  studio_name:      string;
  category_name:    string | null;
  article_name:     string;
  article_type:     string[];
  user_email:       string;
  user_phone:       string;
}

export interface ReservationAddonDB {
  id:           string;
  name:         string;
  price:        number;
  duration_delta_minutes: number;
  group_id:     string | null;
  is_exclusive: boolean;
}

export interface ReservationRatingDB {
  rating:     number;
  comment:    string | null;
  created_at: Date;
}

// ---- Diff type for many updates ----

export type ReservationDiff = {
  toInsert: Reservation[];
  toUpdate: Reservation[];
  toDelete: string[];
};

export interface LoadReservationOptions {
  studio? : string, // by studio id
  service? : string, // by service id
  package?: string, // by package id
  articleType?: string[],  // by type id
  reservation?: string,  // by id
  timeslot?: timerange,  // by timeslot occurance id
  reservationTime?: timerange, // by when it was reserved
  location?: Location, // by location
  status?: reservation_status[], // by status
}