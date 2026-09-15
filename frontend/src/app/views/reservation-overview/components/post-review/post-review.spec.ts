import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostReview } from './post-review';

describe('PostReview', () => {
  let component: PostReview;
  let fixture: ComponentFixture<PostReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostReview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
