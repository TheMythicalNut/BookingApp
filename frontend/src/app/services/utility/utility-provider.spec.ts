import { TestBed } from '@angular/core/testing';

import { UtilityProvider } from './utility-provider';

describe('UtilityProvider', () => {
  let service: UtilityProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilityProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
