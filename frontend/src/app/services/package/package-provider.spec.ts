import { TestBed } from '@angular/core/testing';

import { PackageProvider } from './package-provider';

describe('PackageProvider', () => {
  let service: PackageProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackageProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
