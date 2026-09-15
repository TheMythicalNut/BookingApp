import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudioView } from './studio';

describe('Studio', () => {
  let component: StudioView;
  let fixture: ComponentFixture<StudioView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudioView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudioView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
