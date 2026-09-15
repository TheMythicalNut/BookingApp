import { TestBed } from '@angular/core/testing';

import { UnifiedSingleProvider } from './unified-single-provider';

describe('UnifiedSingleProvider', () => {
  let service: UnifiedSingleProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnifiedSingleProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
