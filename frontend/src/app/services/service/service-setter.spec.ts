import { TestBed } from '@angular/core/testing';

import { ServiceSetter } from './service-setter';

describe('ServiceSetter', () => {
  let service: ServiceSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
