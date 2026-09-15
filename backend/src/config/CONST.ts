import type { reservation_status } from "../types/reservation.js";

export const BLOCKING_STATUSES = new Set<reservation_status>([
  "PENDING_CONFIRMATION",
  "CONFIRMED"
]);

export const DEFAULT_MIN_AHEAD = 1440; // 1 day
export const DEFAULT_MAX_AHEAD = 43200; // 30 days


export const AVAILABILITY_TTL = 300;
export const MAX_TERM_CHANGE_COUNT = 2;