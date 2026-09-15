import { TestBed } from '@angular/core/testing';

import { StudioProvider } from './studio-provider';

describe('StudioProvider', () => {
  let service: StudioProvider;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudioProvider);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
