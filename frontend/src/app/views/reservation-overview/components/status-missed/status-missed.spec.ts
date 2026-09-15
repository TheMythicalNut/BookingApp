import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusMissed } from './status-missed';

describe('StatusMissed', () => {
  let component: StatusMissed;
  let fixture: ComponentFixture<StatusMissed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusMissed]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusMissed);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
