import { TestBed } from '@angular/core/testing';

import { PackageSetter } from './package-setter';

describe('PackageSetter', () => {
  let service: PackageSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackageSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
