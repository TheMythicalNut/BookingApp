import { TestBed } from '@angular/core/testing';

import { AddonsSetter } from './addons-setter';

describe('AddonsSetter', () => {
  let service: AddonsSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddonsSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
