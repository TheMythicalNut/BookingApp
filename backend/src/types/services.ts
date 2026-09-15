import type { Location } from "./location.js";
import type { timerange } from "./util.js";


export type ServiceDiff = {
  toInsert: Service[];
  toUpdate: Service[];
  toDelete: string[];
};

export type ServiceDB = {
  id:                string;
  studio_id:         string;
  type:              string;
  name:              string;
  link:              string;
  price:             number;
  currency:          string;
  discount:          number;
  duration_minutes:  number;
  description:       string | null;
  thumbnail:         string | null;
  is_reservable:     boolean;
  prerequirement_id: string | null;
  created_at:        Date;
  updated_at:        Date;
  // aggregated
  gallery:           { id: string; key: string; timestamp: number }[] | null;
  category:          string | null;
  addons:            Addon[];
  packages:          string[] | null;
};

export type ServiceImageDB = {
  id:            string;
  service_id:    string;
  key:          string;
  display_order: number;
  created_at:    Date;
};


export interface Service {
    localID: string,
    id: string,
    name: string,

    link: string,
    price: string,
    currency: string,
    discount: number,
    duration: number, // minutes
    description: string,
    thumbnail: { key: string, url: string },
    gallery: {key: string, url: string, timestamp: number}[],
    isReservable: boolean,
    addons: Addon[];

    prerequiredService: string, // SERVICE - foreign key
    type: string[], // SERVICE_TYPE - foreign keys
    packages:  string[], // PACKAGE - foreign keys
    studio: string, // STUDIO - foreign key
    category: string, // FROM STUDIO ENTITY
}

export interface TimestampedImage{
  id: string,
  key: string,
  file: File | null,
  timestamp: number 
}

export interface Addon {
  id: string;
  name: string;
  price: string | null; // 0 is free
  durationDelta: number | null,
  group: string | null;
  isExclusive: boolean;
}


export interface ServiceOptions {
  location?: Location,
  timeslot?: timerange,
  serviceType?: string,
  amount?: number,  // might return less than amount if the amount of results is insufficient
  include: string[] // ids forcefully included as results
  exclude: string[] // ids forcefully excluded from potential results
}
