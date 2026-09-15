import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberField } from './number-field';

describe('NumberField', () => {
  let component: NumberField;
  let fixture: ComponentFixture<NumberField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NumberField);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
