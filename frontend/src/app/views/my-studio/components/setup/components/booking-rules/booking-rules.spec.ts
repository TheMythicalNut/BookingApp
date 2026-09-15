import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingRules } from './booking-rules';

describe('BookingRules', () => {
  let component: BookingRules;
  let fixture: ComponentFixture<BookingRules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingRules]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookingRules);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
