import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterArticles } from './filter-articles';

describe('FilterArticles', () => {
  let component: FilterArticles;
  let fixture: ComponentFixture<FilterArticles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterArticles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterArticles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
