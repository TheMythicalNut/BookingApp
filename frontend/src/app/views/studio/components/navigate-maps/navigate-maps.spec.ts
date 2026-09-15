import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NavigateMaps } from './navigate-maps';

describe('NavigateMaps', () => {
  let component: NavigateMaps;
  let fixture: ComponentFixture<NavigateMaps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavigateMaps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NavigateMaps);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
