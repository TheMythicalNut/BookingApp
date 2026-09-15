import { TestBed } from '@angular/core/testing';

import { UnifiedListProvider } from './unified-list-provider';

describe('UnifiedListProvider', () => {
  let service: UnifiedListProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UnifiedListProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
