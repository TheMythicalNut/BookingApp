import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeDrum } from './time-drum';

describe('TimeDrum', () => {
  let component: TimeDrum;
  let fixture: ComponentFixture<TimeDrum>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeDrum]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeDrum);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
