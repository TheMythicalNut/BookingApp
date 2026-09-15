import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalService } from './modal-service';

describe('ModalService', () => {
  let component: ModalService;
  let fixture: ComponentFixture<ModalService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalService);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
