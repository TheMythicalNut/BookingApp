import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListStudios } from './list-studios';

describe('ListStudios', () => {
  let component: ListStudios;
  let fixture: ComponentFixture<ListStudios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListStudios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListStudios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
