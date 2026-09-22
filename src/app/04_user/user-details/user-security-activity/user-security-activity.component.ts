import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { auditEventDisplay, auditEventGroups, auditEventTypeMap } from '@shared/models/data/audit-log';
import { AuditLogFiltersComponent } from '@shared/components/audit-log-filters/audit-log-filters.component';
import {
  AUDIT_DEFAULT_PAGE_SIZE,
  AuditLogTableComponent,
} from '@shared/components/audit-log-table/audit-log-table.component';
import {
  AUDIT_EVENT_DIALOG_CONFIG,
  AuditEventDialog,
  AuditEventDialogData,
} from '@shared/dialogs/audit-event-dialog.component';
import { AuditEvent, AuditEventPage, AuditLogFilter, AuditLogService } from '@shared/services/audit-log.service';

@Component({
  selector: 'spx-user-security-activity',
  imports: [MatIconModule, AuditLogFiltersComponent, AuditLogTableComponent],
  templateUrl: './user-security-activity.component.html',
  styleUrl: './user-security-activity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSecurityActivityComponent {
  private readonly auditSvc = inject(AuditLogService);
  private readonly dialog = inject(MatDialog);

  filter = signal<AuditLogFilter>({ eventTypes: [] });
  pageIndex = signal(0);
  pageSize = signal(AUDIT_DEFAULT_PAGE_SIZE);
  private needReload = signal(0);

  // Platform-wide value, fetched once per tab open
  retention = rxResource({ stream: () => this.auditSvc.getUserRetention() });
  eventTypes = rxResource({ stream: () => this.auditSvc.listUserEventTypes() });
  protected eventTypeList = computed(() => (this.eventTypes.hasValue() ? this.eventTypes.value() : []));
  protected eventGroups = computed(() => auditEventGroups(this.eventTypeList()));

  events = rxResource({
    params: () => ({
      filter: this.filter(),
      pageIndex: this.pageIndex(),
      pageSize: this.pageSize(),
      reload: this.needReload(),
    }),
    stream: ({ params }) =>
      this.auditSvc.listUser({
        ...params.filter,
        limit: params.pageSize,
        offset: params.pageIndex * params.pageSize,
      }),
  });

  // Keeps the previous page visible while the next one loads
  protected page = linkedSignal<AuditEventPage | undefined, AuditEventPage | undefined>({
    source: () => (this.events.hasValue() ? this.events.value() : undefined),
    computation: (value, previous) => value ?? (this.events.isLoading() ? previous?.value : undefined),
  });

  updateFilter(filter: AuditLogFilter) {
    this.filter.set(filter);
    this.pageIndex.set(0);
  }

  updatePage(event: PageEvent) {
    this.pageIndex.set(event.pageSize !== this.pageSize() ? 0 : event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  reloadData() {
    this.needReload.update(v => v + 1);
  }

  openEvent(event: AuditEvent) {
    const data: AuditEventDialogData = {
      event,
      display: auditEventDisplay(event, auditEventTypeMap(this.eventTypeList())),
    };
    this.dialog.open(AuditEventDialog, { ...AUDIT_EVENT_DIALOG_CONFIG, data });
  }
}
