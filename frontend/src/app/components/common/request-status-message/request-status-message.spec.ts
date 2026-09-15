import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestStatusMessage } from './request-status-message';

describe('RequestStatusMessage', () => {
  let component: RequestStatusMessage;
  let fixture: ComponentFixture<RequestStatusMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestStatusMessage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RequestStatusMessage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
