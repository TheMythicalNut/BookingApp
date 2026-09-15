import { TestBed } from '@angular/core/testing';

import { ReservationProvider } from './reservation-provider';

describe('ReservationProvider', () => {
  let service: ReservationProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReservationProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
