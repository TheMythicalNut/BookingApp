import { TestBed } from '@angular/core/testing';

import { ScheduleExceptionsSetter } from './schedule-exceptions-setter';

describe('ScheduleExceptionsSetter', () => {
  let service: ScheduleExceptionsSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleExceptionsSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
