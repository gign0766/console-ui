import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuditLogFilter } from '@shared/services/audit-log.service';
import { AuditLogFiltersComponent } from './audit-log-filters.component';

describe('AuditLogFiltersComponent', () => {
  let fixture: ComponentFixture<AuditLogFiltersComponent>;
  let emitted: AuditLogFilter[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogFiltersComponent);
    emitted = [];
    fixture.componentInstance.filterChange.subscribe(f => emitted.push(f));
  });

  it('should create', () => {
    fixture.componentRef.setInput('filter', { eventTypes: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should only offer "Clear filters" when a filter is active', () => {
    fixture.componentRef.setInput('filter', { eventTypes: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Clear filters');

    fixture.componentRef.setInput('filter', { eventTypes: [], status: 'failed' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Clear filters');
  });

  it('should hide the organization-only filters in user mode', () => {
    fixture.componentRef.setInput('filter', { eventTypes: [] });
    fixture.componentRef.setInput('mode', 'user');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Project');
    expect(fixture.nativeElement.textContent).not.toContain('Initiator email');
  });

  it('should offer the event types of the API and the retired ones', () => {
    fixture.componentRef.setInput('filter', { eventTypes: [] });
    fixture.componentRef.setInput('eventGroups', [
      {
        resourceType: 'disk',
        resourceLabel: 'Disk',
        events: [{ eventType: 'disk.create', resourceType: 'disk', resourceLabel: 'Disk', action: 'create' }],
      },
    ]);
    fixture.detectChanges();

    const select: HTMLElement = fixture.nativeElement.querySelector('mat-select');
    select.click();
    fixture.detectChanges();

    const options = Array.from(document.querySelectorAll('mat-option')).map(o => o.textContent!.trim());
    expect(options).toContain('Disk create');
    expect(options).toContain('Retired event types');
    expect(document.body.textContent).toContain('Miscellaneous');
    expect(document.querySelector('mat-optgroup')!.textContent).toContain('Disk');
  });

  it('should trim a text filter and not emit when it did not change', () => {
    fixture.componentRef.setInput('filter', { eventTypes: [], resourceId: 'spx-1' });
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelectorAll('input[type="text"]')[0];
    input.value = ' spx-1 ';
    input.dispatchEvent(new Event('blur'));
    expect(emitted.length).toBe(0);

    input.value = ' spx-2 ';
    input.dispatchEvent(new Event('blur'));
    expect(emitted).toEqual([{ eventTypes: [], resourceId: 'spx-2' }]);
  });
});
