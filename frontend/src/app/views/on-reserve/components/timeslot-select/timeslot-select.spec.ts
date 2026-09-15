import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeslotSelect } from './timeslot-select';

describe('TimeslotSelect', () => {
  let component: TimeslotSelect;
  let fixture: ComponentFixture<TimeslotSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeslotSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeslotSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
