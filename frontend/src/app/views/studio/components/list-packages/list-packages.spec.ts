import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListPackages } from './list-packages';

describe('ListPackages', () => {
  let component: ListPackages;
  let fixture: ComponentFixture<ListPackages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListPackages]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListPackages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
