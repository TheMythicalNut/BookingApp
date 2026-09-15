import { TestBed } from '@angular/core/testing';

import { StudioSetter } from './studio-setter';

describe('StudioSetter', () => {
  let service: StudioSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StudioSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
