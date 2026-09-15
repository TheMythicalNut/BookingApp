import type { Location } from "./location.js";

export type SetupState = 'INTRO' | 'PROFILE' | 'LOCATION' | 'MEDIA' | 'SCHEDULE' | 'EXCEPTIONS' | 'CATEGORIES' | 'SERVICES' | 'PACKAGES' | 'DISCOUNTS' | 'BOOKING_RULES' | 'PUBLISH' | 'COMPLETED';

export interface Owner {
    id: string;
    firstName: string;
    lastName: string;
    studio: string;
    email: string;
    setupState: SetupState;
    status: string;
}

export interface OwnerDB {
  id: string;               // UUID
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  setup_state: SetupState;
  status: string;
  studio_id: string;        // UUID
}

export interface OwnerOptions {
  studio? : string, // by studio id
  service? : string, // by service id
  package?: string, // by package id
  reservation?: string, // by reservation id
  location?: Location, // by location
  owner?: string, // by owner id
  token?: string, // by session token
}
