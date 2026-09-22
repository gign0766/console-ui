import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { auditEventDisplay, auditEventGroups, auditEventTypeMap } from '@shared/models/data/audit-log';
import { AuditLogFiltersComponent } from '@shared/components/audit-log-filters/audit-log-filters.component';
import { AuditLogTableComponent } from '@shared/components/audit-log-table/audit-log-table.component';
import { ContentHeaderComponent } from '@shared/components/content-header/content-header.component';
import {
  AUDIT_EVENT_DIALOG_CONFIG,
  AuditEventDialog,
  AuditEventDialogData,
  AuditEventDialogResult,
} from '@shared/dialogs/audit-event-dialog.component';
import { AuditRetentionDialog, AuditRetentionDialogResult } from '@shared/dialogs/audit-retention-dialog.component';
import { ConfirmDialog } from '@shared/dialogs/confirm-dialog/confirm-dialog.component';
import { PermissionsEnum } from '@shared/models/permissions/permission.enum';
import {
  AuditEvent,
  AuditEventPage,
  AuditLogFilter,
  AuditLogService,
  AuditRetention,
} from '@shared/services/audit-log.service';
import { PermissionService } from '@shared/services/permission.service';
import { StateService } from '@shared/services/state.service';
import { auditLogStateFromParams, auditLogStateToParams } from './audit-log-query-params';

@Component({
  selector: 'spx-organization-audit-log',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    ContentHeaderComponent,
    AuditLogFiltersComponent,
    AuditLogTableComponent,
  ],
  templateUrl: './organization-audit-log.component.html',
  styleUrl: './organization-audit-log.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAuditLogComponent {
  protected stateSvc = inject(StateService);
  protected permissionSvc = inject(PermissionService);
  private readonly auditSvc = inject(AuditLogService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  canAuditLogWrite = computed(() =>
    this.permissionSvc.permissions().includes(PermissionsEnum.OrganizationAuditLogWrite)
  );

  // Filters and page live in the URL query params
  private readonly initialState = auditLogStateFromParams(this.route.snapshot.queryParamMap);
  filter = signal<AuditLogFilter>(this.initialState.filter);
  pageIndex = signal(this.initialState.pageIndex);
  pageSize = signal(this.initialState.pageSize);
  private needReload = signal(0);

  protected projects = computed(() => this.stateSvc.organization()?.projects ?? []);

  // Static per API version, one fetch per organization
  eventTypes = rxResource({
    params: () => this.stateSvc.organization()?.id,
    stream: ({ params }) => this.auditSvc.listOrganizationEventTypes(params),
  });
  protected eventTypeList = computed(() => (this.eventTypes.hasValue() ? this.eventTypes.value() : []));
  protected eventGroups = computed(() => auditEventGroups(this.eventTypeList()));

  events = rxResource({
    params: () => {
      const orgId = this.stateSvc.organization()?.id;
      if (!orgId) {
        return undefined;
      }
      return {
        orgId,
        filter: this.filter(),
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
        reload: this.needReload(),
      };
    },
    stream: ({ params }) =>
      this.auditSvc.listOrganization(params.orgId, {
        ...params.filter,
        limit: params.pageSize,
        offset: params.pageIndex * params.pageSize,
      }),
  });

  retention = rxResource({
    params: () => {
      const orgId = this.stateSvc.organization()?.id;
      return orgId ? { orgId, reload: this.needReload() } : undefined;
    },
    stream: ({ params }) => this.auditSvc.getRetention(params.orgId),
  });

  // Keeps the previous page visible while the next one loads
  protected page = linkedSignal<AuditEventPage | undefined, AuditEventPage | undefined>({
    source: () => (this.events.hasValue() ? this.events.value() : undefined),
    computation: (value, previous) => value ?? (this.events.isLoading() ? previous?.value : undefined),
  });

  private lastOrgId: string | undefined;

  constructor() {
    effect(() => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: auditLogStateToParams({
          filter: this.filter(),
          pageIndex: this.pageIndex(),
          pageSize: this.pageSize(),
        }),
        replaceUrl: true,
      });
    });

    // Reset filters and page when the organization changes
    effect(() => {
      const orgId = this.stateSvc.organization()?.id;
      if (orgId && this.lastOrgId && orgId !== this.lastOrgId) {
        this.filter.set({ eventTypes: [] });
        this.pageIndex.set(0);
      }
      this.lastOrgId = orgId ?? this.lastOrgId;
    });
  }

  updateFilter(filter: AuditLogFilter) {
    this.filter.set(filter);
    this.pageIndex.set(0);
  }

  updatePage(event: PageEvent) {
    // A new page size restarts at the first page
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
      projectName: this.projects().find(p => p.id === event.projectId)?.name,
      canFilterResource: this.filter().resourceId !== event.resourceId,
    };
    this.dialog
      .open(AuditEventDialog, { ...AUDIT_EVENT_DIALOG_CONFIG, data })
      .afterClosed()
      .subscribe((res?: AuditEventDialogResult) => {
        if (res?.filterResourceId) {
          this.updateFilter({ eventTypes: [], resourceId: res.filterResourceId });
        }
      });
  }

  editRetention() {
    const current = this.retention.hasValue() ? this.retention.value() : undefined;
    if (!current) {
      return;
    }
    this.dialog
      .open(AuditRetentionDialog, { data: current })
      .afterClosed()
      .subscribe((res?: AuditRetentionDialogResult) => {
        if (!res) {
          return;
        }
        const effectiveDays = res.retentionDays ?? current.defaultDays;
        if (effectiveDays < current.retentionDays) {
          this.confirmLowerRetention(current, res.retentionDays, effectiveDays);
        } else {
          this.saveRetention(res.retentionDays);
        }
      });
  }

  private confirmLowerRetention(current: AuditRetention, retentionDays: number | null, effectiveDays: number) {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          title: 'Lower the audit log retention?',
          html: `<p>The retention goes from <b>${current.retentionDays}</b> to <b>${effectiveDays}</b> days.</p>
            <p>Events older than ${effectiveDays} days will be permanently deleted.</p>
            <span class="color-error"><i>This action is irreversible.</i></span>`,
          confirmBtn: 'Lower retention',
        },
      })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) {
          this.saveRetention(retentionDays);
        }
      });
  }

  private saveRetention(retentionDays: number | null) {
    const orgId = this.stateSvc.organization()?.id;
    if (!orgId) {
      return;
    }
    // The retention change is itself an audit event, reload the list too
    this.auditSvc.updateRetention(orgId, retentionDays).subscribe(() => this.reloadData());
  }
}
