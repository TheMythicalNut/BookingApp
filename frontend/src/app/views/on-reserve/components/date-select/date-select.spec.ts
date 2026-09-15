import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateSelect } from './date-select';

describe('DateSelect', () => {
  let component: DateSelect;
  let fixture: ComponentFixture<DateSelect>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateSelect]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateSelect);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
