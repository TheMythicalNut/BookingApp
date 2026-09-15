import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmRegistration } from './confirm-registration';

describe('ConfirmRegistration', () => {
  let component: ConfirmRegistration;
  let fixture: ComponentFixture<ConfirmRegistration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmRegistration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmRegistration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
