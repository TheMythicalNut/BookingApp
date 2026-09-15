import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TwoStateButton } from './two-state-button';

describe('TwoStateButton', () => {
  let component: TwoStateButton;
  let fixture: ComponentFixture<TwoStateButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TwoStateButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TwoStateButton);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
