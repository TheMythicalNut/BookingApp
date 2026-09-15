import { TestBed } from '@angular/core/testing';

import { OwnerProvider } from './owner-provider';

describe('OwnerProvider', () => {
  let service: OwnerProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OwnerProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
