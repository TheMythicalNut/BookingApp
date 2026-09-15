import { TestBed } from '@angular/core/testing';

import { MediaSetter } from './media-setter';

describe('MediaSetter', () => {
  let service: MediaSetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaSetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
