import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SshListComponent } from './ssh-list.component';

describe('SshListComponent', () => {
  let component: SshListComponent;
  let fixture: ComponentFixture<SshListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SshListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SshListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
