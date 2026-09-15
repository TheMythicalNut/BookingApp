import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenStatus } from './open-status';

describe('OpenStatus', () => {
  let component: OpenStatus;
  let fixture: ComponentFixture<OpenStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenStatus]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenStatus);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
