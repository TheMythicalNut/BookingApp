import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterStudios } from './filter-studios';

describe('FilterStudios', () => {
  let component: FilterStudios;
  let fixture: ComponentFixture<FilterStudios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilterStudios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterStudios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
