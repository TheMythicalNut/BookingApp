import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiImageUpload } from './multi-image-upload';

describe('MultiImageUpload', () => {
  let component: MultiImageUpload;
  let fixture: ComponentFixture<MultiImageUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiImageUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiImageUpload);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
