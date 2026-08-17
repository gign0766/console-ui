import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InstanceListComponent } from './instance-list.component';

describe('InstanceListComponent', () => {
  let component: InstanceListComponent;
  let fixture: ComponentFixture<InstanceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstanceListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
