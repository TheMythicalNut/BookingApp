import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalNavigation } from './modal-navigation';

describe('ModalNavigation', () => {
  let component: ModalNavigation;
  let fixture: ComponentFixture<ModalNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalNavigation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalNavigation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
