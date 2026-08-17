import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DiskListComponent } from './disk-list.component';

describe('DiskListComponent', () => {
  let component: DiskListComponent;
  let fixture: ComponentFixture<DiskListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiskListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DiskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
