import { TestBed } from '@angular/core/testing';

import { DiscountsSetter } from './discounts-setter';

describe('DiscountsSetter', () => {
  let service: DiscountsSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiscountsSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
