import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContactBar } from './contact-bar';

describe('ContactBar', () => {
  let component: ContactBar;
  let fixture: ComponentFixture<ContactBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContactBar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
