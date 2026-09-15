import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Multideclare } from './multideclare';

describe('Multideclare', () => {
  let component: Multideclare;
  let fixture: ComponentFixture<Multideclare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Multideclare]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Multideclare);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
