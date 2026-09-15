import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyStudio } from './my-studio';

describe('MyStudio', () => {
  let component: MyStudio;
  let fixture: ComponentFixture<MyStudio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyStudio]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
