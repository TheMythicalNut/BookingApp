import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnReserve } from './on-reserve';

describe('OnReserve', () => {
  let component: OnReserve;
  let fixture: ComponentFixture<OnReserve>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnReserve]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnReserve);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
