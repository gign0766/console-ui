import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSecurityActivityComponent } from './user-security-activity.component';

describe('UserSecurityActivityComponent', () => {
  let component: UserSecurityActivityComponent;
  let fixture: ComponentFixture<UserSecurityActivityComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSecurityActivityComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UserSecurityActivityComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should query the user-level route with the page', () => {
    const req = http.expectOne(r => r.url.endsWith('/v1/user/audit-log'));
    expect(req.request.params.get('limit')).toBe('25');
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.has('userEmail')).toBeFalse();
    http.expectOne(r => r.url.endsWith('/v1/user/audit-log/event-types'));
  });

  it('should tell how long the activity is kept', async () => {
    http.expectOne(r => r.url.endsWith('/v1/user/audit-log/retention')).flush({ retentionDays: 30 });
    http.expectOne(r => r.url.endsWith('/v1/user/audit-log/event-types')).flush({ items: [] });
    http.expectOne(r => r.url.endsWith('/v1/user/audit-log')).flush({ items: [], total: 0, limit: 25, offset: 0 });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Activity is kept for 30 days');
  });

  it('should go back to the first page when a filter changes', () => {
    component.pageIndex.set(2);
    component.updateFilter({ eventTypes: ['session.login'] });
    expect(component.pageIndex()).toBe(0);
  });
});
