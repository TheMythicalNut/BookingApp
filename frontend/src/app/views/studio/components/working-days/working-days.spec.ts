import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkingDays } from './working-days';

describe('WorkingDays', () => {
  let component: WorkingDays;
  let fixture: ComponentFixture<WorkingDays>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkingDays]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WorkingDays);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
