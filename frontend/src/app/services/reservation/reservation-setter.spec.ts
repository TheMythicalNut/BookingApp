import { TestBed } from '@angular/core/testing';

import { ReservationSetter } from './reservation-setter';

describe('ReservationSetter', () => {
  let service: ReservationSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReservationSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
