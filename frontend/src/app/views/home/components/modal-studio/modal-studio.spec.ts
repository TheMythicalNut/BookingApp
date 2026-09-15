import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalStudio } from './modal-studio';

describe('ModalStudio', () => {
  let component: ModalStudio;
  let fixture: ComponentFixture<ModalStudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalStudio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
