import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { localTimezoneLabel } from '@products/00_shared/utils/time';
import { auditEventDisplay, auditEventTypeMap, auditStatusChip } from '@shared/models/data/audit-log';
import { Project } from '@shared/models/data/organization';
import { AuditEvent, AuditEventPage, AuditEventType } from '@shared/services/audit-log.service';

export const AUDIT_PAGE_SIZES = [10, 25, 50, 100];
export const AUDIT_DEFAULT_PAGE_SIZE = 25;

@Component({
  selector: 'spx-audit-log-table',
  imports: [DatePipe, MatTableModule, MatPaginatorModule, MatChipsModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './audit-log-table.component.html',
  styleUrl: './audit-log-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogTableComponent {
  page = input.required<AuditEventPage | undefined>();
  loading = input(false);
  error = input(false);
  pageIndex = input(0);
  pageSize = input(AUDIT_DEFAULT_PAGE_SIZE);
  // Organization-level columns
  showUser = input(true);
  showProject = input(true);
  projects = input<Project[]>([]);
  // Names the events. Unknown types show their raw identifier
  eventTypes = input<AuditEventType[]>([]);

  pageChange = output<PageEvent>();
  rowClick = output<AuditEvent>();

  protected readonly pageSizes = AUDIT_PAGE_SIZES;
  protected readonly timezoneLabel = localTimezoneLabel();
  protected readonly statusChip = auditStatusChip;

  protected events = computed(() => this.page()?.items ?? []);

  protected displayedColumns = computed(() =>
    ['startedAt', 'eventType', 'resource', 'project', 'user', 'sourceIp', 'status'].filter(
      col => (col !== 'project' || this.showProject()) && (col !== 'user' || this.showUser())
    )
  );

  private projectNames = computed(() => new Map(this.projects().map(p => [p.id, p.name])));
  private types = computed(() => auditEventTypeMap(this.eventTypes()));

  protected display(event: AuditEvent) {
    return auditEventDisplay(event, this.types());
  }

  // Unknown projects (deleted, for instance) fall back to their id
  protected projectName(id: string) {
    return this.projectNames().get(id) ?? id;
  }

  protected trackBy(_index: number, event: AuditEvent) {
    return event.id;
  }
}
