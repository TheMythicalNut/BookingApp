import { TestBed } from '@angular/core/testing';

import { LocationProvider } from './location-provider';

describe('LocationProvider', () => {
  let service: LocationProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
