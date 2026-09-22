import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { auditEventGroups, auditEventLabel } from '@shared/models/data/audit-log';
import { AuditEvent, AuditEventType } from '@shared/services/audit-log.service';
import { AuditEventDialog, AuditEventDialogData } from './audit-event-dialog.component';

const fullEvent: AuditEvent = {
  id: '0b9f6e0e-6d0e-4f5e-9d0a-3a1f3c1f7a10',
  organizationId: '7989f9a1-b255-470e-8d07-78439e8be2fe',
  projectId: 'ea5a03fa-421a-466d-ab78-5e0ac53a8ccd',
  eventType: 'disk.create',
  resourceType: 'disk',
  resourceId: 'spx-4c3ca316-9fa2-5521-b09c-c816c79d4d37',
  userId: 'cb6dfcc8-6b2f-4700-bff5-d8e97c5f6649',
  userEmail: 'jane@example.com',
  authType: 'JwtBearer',
  sourceIp: '203.0.113.7',
  status: 'success',
  statusCode: 200,
  requestId: 'cf8bb66e75ea/fUVzsXblPz-000087',
  startedAt: new Date('2026-09-21T14:21:40.512Z'),
  completedAt: new Date('2026-09-21T14:21:41.004Z'),
};

const display = { label: 'Disk create', resourceLabel: 'Disk' };

function render(data: AuditEventDialogData): HTMLElement {
  TestBed.configureTestingModule({
    imports: [AuditEventDialog],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
    ],
  });
  const fixture = TestBed.createComponent(AuditEventDialog);
  fixture.detectChanges();
  return fixture.nativeElement;
}

function labels(el: HTMLElement): string[] {
  return Array.from(el.querySelectorAll('dt')).map(dt => dt.textContent!.trim());
}

describe('AuditEventDialog', () => {
  const cases: {
    name: string;
    data: AuditEventDialogData;
    title: string;
    outcome: string[];
    present: string[];
    absent: string[];
  }[] = [
    {
      name: 'a successful event shows every row',
      data: { event: fullEvent, display, projectName: 'demo', canFilterResource: true },
      title: 'Disk create',
      outcome: ['Success', 'HTTP 200', 'took 492 ms'],
      present: ['Initiator', 'User ID', 'Signed in with', 'Resource ID', 'Project', 'Project ID', 'Request ID'],
      absent: [],
    },
    {
      name: 'a failed event does not claim the action happened',
      data: { display, event: { ...fullEvent, status: 'failed', statusCode: 403, resourceId: undefined } },
      title: 'Disk create',
      outcome: ['Failed', 'HTTP 403'],
      present: ['Resource'],
      absent: ['Resource ID'],
    },
    {
      name: 'an attempted event has no outcome to show',
      data: { display, event: { ...fullEvent, status: 'attempted', statusCode: undefined, completedAt: undefined } },
      title: 'Disk create',
      outcome: ['Attempted, no outcome recorded'],
      present: ['Completed'],
      absent: [],
    },
    {
      name: 'an organization-level event omits the rows it has no value for',
      data: {
        display: { label: 'IAM Member invite', resourceLabel: 'IAM Member' },
        event: {
          ...fullEvent,
          eventType: 'iam.member.invite',
          resourceType: 'iam.member',
          projectId: undefined,
          userId: undefined,
          authType: undefined,
        },
      },
      title: 'IAM Member invite',
      outcome: ['Success'],
      present: ['Initiator', 'Resource ID'],
      absent: ['Project', 'Project ID', 'User ID', 'Signed in with'],
    },
  ];

  cases.forEach(({ name, data, title, outcome, present, absent }) => {
    it(name, () => {
      const el = render(data);

      expect(el.querySelector('.audit-event__title')!.textContent).toContain(title);
      const band = el.querySelector('.audit-event__outcome')!;
      expect(band.className).toContain('audit-event__outcome--' + data.event.status);
      outcome.forEach(text => expect(band.textContent).toContain(text));
      if (data.event.status === 'attempted') {
        expect(band.textContent).not.toContain('took');
        expect(el.textContent).toContain('Outcome never recorded');
      }

      const shown = labels(el);
      present.forEach(label => expect(shown).toContain(label));
      absent.forEach(label => expect(shown).not.toContain(label));
    });
  });

  it('should only offer the resource shortcut when asked and possible', () => {
    expect(render({ event: fullEvent, display, canFilterResource: true }).textContent).toContain('All events for this resource');
    TestBed.resetTestingModule();
    expect(render({ event: fullEvent, display }).textContent).not.toContain('All events for this resource');
  });

  it('should name a project that no longer exists', () => {
    expect(render({ event: fullEvent, display }).textContent).toContain('Deleted or unknown project');
  });
});

describe('auditEventGroups', () => {
  const type = (eventType: string, resourceType: string, resourceLabel: string): AuditEventType => ({
    eventType,
    resourceType,
    resourceLabel,
    action: eventType.slice(resourceType.length + 1),
  });

  it('should group by resource in the order of the API', () => {
    const groups = auditEventGroups([
      type('instance.stop-force', 'instance', 'Instance'),
      type('disk.create', 'disk', 'Disk'),
      type('instance.create', 'instance', 'Instance'),
    ]);

    expect(groups.map(g => g.resourceLabel)).toEqual(['Instance', 'Disk']);
    expect(groups[0].events.map(auditEventLabel)).toEqual(['Instance stop-force', 'Instance create']);
    expect(groups[1].events.map(e => e.eventType)).toEqual(['disk.create']);
  });

  it('should give nothing for nothing', () => {
    expect(auditEventGroups([])).toEqual([]);
  });
});
