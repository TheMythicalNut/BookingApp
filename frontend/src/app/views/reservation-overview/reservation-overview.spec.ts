import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReservationOverview } from './reservation-overview';

describe('ReservationOverview', () => {
  let component: ReservationOverview;
  let fixture: ComponentFixture<ReservationOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationOverview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReservationOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
