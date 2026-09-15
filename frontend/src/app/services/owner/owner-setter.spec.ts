import { TestBed } from '@angular/core/testing';

import { OwnerSetter } from './owner-setter';

describe('OwnerSetter', () => {
  let service: OwnerSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OwnerSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
