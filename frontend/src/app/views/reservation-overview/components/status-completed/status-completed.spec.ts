import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatusCompleted } from './status-completed';

describe('StatusCompleted', () => {
  let component: StatusCompleted;
  let fixture: ComponentFixture<StatusCompleted>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusCompleted]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatusCompleted);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
