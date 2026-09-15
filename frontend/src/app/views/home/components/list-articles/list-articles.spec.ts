import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListArticles } from './list-articles';

describe('ListArticles', () => {
  let component: ListArticles;
  let fixture: ComponentFixture<ListArticles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListArticles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListArticles);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
