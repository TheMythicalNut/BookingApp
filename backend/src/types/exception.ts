// DB types
export type ScheduleExceptionDB = {
  id:         string;
  studio_id:  string;
  label:      string | null;
  is_closed:  boolean;
  created_at: Date;
  updated_at: Date;
};

export type TimeIntervalDB = {
  id:               string;
  day_schedule_id:  string | null;
  exception_id:     string | null;
  start_time:       string;
  end_time:         string;
};

export type ExceptionDateRuleDB = {
  id:           string;
  exception_id: string;
  type:         'oneOff' | 'range' | 'annual';
  date:         string | null;
  start_date:   string | null;
  end_date:     string | null;
  month:        number | null;
  day:          number | null;
  created_at:   Date;
};

// Entity types
export type TimeInterval = {
  start: string;
  end:   string;
};

export type ExceptionAppliesTo =
  | { type: 'oneOff';  date: string }
  | { type: 'range';   startDate: string; endDate: string }
  | { type: 'annual';  month: number; day: number };

export type ScheduleException = {
  id:        string;
  label:     string;
  type:      'oneOff' | 'range' | 'annual';
  appliesTo: ExceptionAppliesTo;
  isClosed:  boolean;
  intervals: TimeInterval[];
  studio:    string;
};

export type ExceptionDiff = {
  toInsert: ScheduleException[];
  toUpdate: ScheduleException[];
  toDelete: string[];
};