import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPackage } from './modal-package';

describe('ModalPackage', () => {
  let component: ModalPackage;
  let fixture: ComponentFixture<ModalPackage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalPackage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalPackage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
