import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterTimeslot } from './filter-timeslot';

describe('FilterTimeslot', () => {
  let component: FilterTimeslot;
  let fixture: ComponentFixture<FilterTimeslot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterTimeslot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterTimeslot);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
