import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotifyMessage } from './notify-message';

describe('NotifyMessage', () => {
  let component: NotifyMessage;
  let fixture: ComponentFixture<NotifyMessage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotifyMessage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotifyMessage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
