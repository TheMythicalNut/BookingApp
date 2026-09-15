import { TestBed } from '@angular/core/testing';

import { HydrationProvider } from './hydration-provider';

describe('HydrationProvider', () => {
  let service: HydrationProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HydrationProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
