import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ButtonBookPrimary } from './button-book-primary';

describe('ButtonBookPrimary', () => {
  let component: ButtonBookPrimary;
  let fixture: ComponentFixture<ButtonBookPrimary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonBookPrimary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ButtonBookPrimary);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
