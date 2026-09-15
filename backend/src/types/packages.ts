import type { Location } from "./location.js";
import type { Addon } from "./services.js";
import type { timerange } from "./util.js";

export type PackageDiff = {
  toInsert: Package[];
  toUpdate: Package[];
  toDelete: string[];
};

export type PackageDB = {
  id:                string;
  studio_id:         string;
  name:              string;
  link:              string;
  price:             number;
  currency:          string;
  discount:          number;
  duration_minutes:  number;
  description:       string | null;
  is_reservable:     boolean;
  prerequirement_id: string | null;
  created_at:        Date;
  updated_at:        Date;
  // aggregated
  addons:            AddonDB[] | null;
  services:          string[]  | null;
};

export type AddonDB = {
  id:                     string;
  package_id:             string;
  name:                   string;
  price:                  string;
  duration_delta_minutes: number | null;
  group_id:               string | null;
  is_exclusive:           boolean;
};


export interface Package {
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

    prerequirement: string, // SERVICE - foreign key
    services: string[], // SERVICE - foreign keys
    studio: string, // STUDIO - foreign key
}

export interface PackageOptions {
  location?: Location,
  timeslot?: timerange,
  serviceType?: string,
  amount?: number,  // might return less than amount if the amount of results is insufficient
  include: string[] // ids forcefully included as results
  exclude: string[] // ids forcefully excluded from potential results
}
