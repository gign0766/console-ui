import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditEvent, AuditEventType } from '@shared/services/audit-log.service';
import { AuditLogTableComponent } from './audit-log-table.component';

const diskCreate: AuditEventType = { eventType: 'disk.create', resourceType: 'disk', resourceLabel: 'Disk', action: 'create' };

const event: AuditEvent = {
  id: '0b9f6e0e-6d0e-4f5e-9d0a-3a1f3c1f7a10',
  projectId: 'ea5a03fa-421a-466d-ab78-5e0ac53a8ccd',
  eventType: 'disk.create',
  resourceType: 'disk',
  resourceId: 'spx-4c3ca316-9fa2-5521-b09c-c816c79d4d37',
  userEmail: 'jane@example.com',
  sourceIp: '203.0.113.7',
  status: 'success',
  requestId: 'cf8bb66e75ea/fUVzsXblPz-000087',
  startedAt: new Date('2026-09-21T14:21:40.512Z'),
};

describe('AuditLogTableComponent', () => {
  let fixture: ComponentFixture<AuditLogTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogTableComponent);
  });

  it('should create', () => {
    fixture.componentRef.setInput('page', undefined);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render one row per event with a readable label', () => {
    fixture.componentRef.setInput('page', { items: [event], total: 1, limit: 25, offset: 0 });
    fixture.componentRef.setInput('eventTypes', [diskCreate]);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('mat-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Disk create');
  });

  it('should fall back to the raw type when the API no longer declares it', () => {
    fixture.componentRef.setInput('page', { items: [event], total: 1, limit: 25, offset: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('mat-row').textContent).toContain('disk.create');
  });

  it('should hide the organization-level columns when asked', () => {
    fixture.componentRef.setInput('page', { items: [event], total: 1, limit: 25, offset: 0 });
    fixture.componentRef.setInput('showUser', false);
    fixture.componentRef.setInput('showProject', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.mat-column-user')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mat-column-project')).toBeNull();
  });

  it('should show the empty message when nothing matches', () => {
    fixture.componentRef.setInput('page', { items: [], total: 0, limit: 25, offset: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No events match these filters.');
  });
});
