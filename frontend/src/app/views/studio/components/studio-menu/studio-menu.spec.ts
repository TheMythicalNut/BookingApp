import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudioMenu } from './studio-menu';

describe('StudioMenu', () => {
  let component: StudioMenu;
  let fixture: ComponentFixture<StudioMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudioMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudioMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
