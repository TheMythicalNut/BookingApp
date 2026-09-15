import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoLine } from './info-line';

describe('InfoLine', () => {
  let component: InfoLine;
  let fixture: ComponentFixture<InfoLine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InfoLine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InfoLine);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
