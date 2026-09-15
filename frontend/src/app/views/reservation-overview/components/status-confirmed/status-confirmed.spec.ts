import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusConfirmed } from './status-confirmed';

describe('StatusConfirmed', () => {
  let component: StatusConfirmed;
  let fixture: ComponentFixture<StatusConfirmed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusConfirmed]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusConfirmed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
