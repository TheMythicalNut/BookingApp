import { TestBed } from '@angular/core/testing';

import { ScheduleSetter } from './schedule-setter';

describe('ScheduleSetter', () => {
  let service: ScheduleSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScheduleSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
