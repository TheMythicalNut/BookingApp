import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScheduleExceptions } from './schedule-exceptions';

describe('ScheduleExceptions', () => {
  let component: ScheduleExceptions;
  let fixture: ComponentFixture<ScheduleExceptions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScheduleExceptions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScheduleExceptions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
