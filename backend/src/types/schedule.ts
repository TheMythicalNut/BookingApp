import type { TimeInterval } from "./exception.js";

// DB types
export type WeeklyScheduleDB = {
  id:             string;
  studio_id:      string;
  effective_from: string | null;
  effective_to:   string | null;
  created_at:     Date;
  updated_at:     Date;
};

export type DayScheduleDB = {
  id:                 string;
  weekly_schedule_id: string;
  day_of_week:        number;
  is_closed:          boolean;
};

// TimeIntervalDB already defined in exceptions types

// Entity types
export type DaySchedule = {
  id:        string;
  dayOfWeek: number;
  isClosed:  boolean;
  intervals: TimeInterval[];
};

export type WeeklySchedule = {
  id:            string;
  effectiveFrom: string | null;
  effectiveTo:   string | null;
  days:          DaySchedule[];
  studio:        string;
};

export type ScheduleDiff = {
  toInsert: WeeklySchedule[];
  toUpdate: WeeklySchedule[];
  toDelete: string[];
};