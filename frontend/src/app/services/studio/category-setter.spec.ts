import { TestBed } from '@angular/core/testing';

import { CategorySetter } from './category-setter';

describe('CategorySetter', () => {
  let service: CategorySetter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategorySetter);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
