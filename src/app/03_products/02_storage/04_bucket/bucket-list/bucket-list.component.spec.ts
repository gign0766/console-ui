import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BucketListComponent } from './bucket-list.component';

describe('BucketListComponent', () => {
  let component: BucketListComponent;
  let fixture: ComponentFixture<BucketListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BucketListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BucketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
