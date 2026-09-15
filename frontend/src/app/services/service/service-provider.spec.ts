import { TestBed } from '@angular/core/testing';

import { ServiceProvider } from './service-provider';

describe('ServiceProvider', () => {
  let service: ServiceProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
