import { TestBed } from '@angular/core/testing';

import { UnifiedSetter } from './unified-setter';

describe('UnifiedSetter', () => {
  let service: UnifiedSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnifiedSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
