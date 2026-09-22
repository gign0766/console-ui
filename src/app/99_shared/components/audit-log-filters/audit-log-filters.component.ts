import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  AUDIT_MAX_EVENT_TYPES,
  AUDIT_STATUSES,
  AuditEventGroup,
  auditEventLabel,
  auditStatusChip,
} from '@shared/models/data/audit-log';
import { Project } from '@shared/models/data/organization';
import { AUDIT_OTHER_EVENT_TYPE, AuditLogFilter } from '@shared/services/audit-log.service';

// The API caps free-text filter values at 255 characters
const MAX_TEXT_LENGTH = 255;

@Component({
  selector: 'spx-audit-log-filters',
  providers: [provideNativeDateAdapter()],
  imports: [
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './audit-log-filters.component.html',
  styleUrl: './audit-log-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogFiltersComponent {
  filter = input.required<AuditLogFilter>();
  // `user` hides the resource type, project, initiator and resource ID fields
  mode = input<'organization' | 'user'>('organization');
  projects = input<Project[]>([]);
  // From the API, grouped by resource
  eventGroups = input<AuditEventGroup[]>([]);

  filterChange = output<AuditLogFilter>();
  refresh = output();

  protected readonly statuses = AUDIT_STATUSES;
  protected readonly statusChip = auditStatusChip;
  protected readonly eventLabel = auditEventLabel;
  protected readonly maxEventTypes = AUDIT_MAX_EVENT_TYPES;
  protected readonly maxTextLength = MAX_TEXT_LENGTH;
  protected readonly otherEventType = AUDIT_OTHER_EVENT_TYPE;
  protected readonly today = new Date();

  protected hasFilter = computed(() => {
    const f = this.filter();
    return (
      f.eventTypes.length > 0 ||
      !!(f.resourceType || f.resourceId || f.userEmail || f.projectId || f.status || f.from || f.to)
    );
  });

  // Range being edited, committed when the picker closes
  private pendingFrom: Date | null | undefined;
  private pendingTo: Date | null | undefined;

  protected patch(change: Partial<AuditLogFilter>) {
    this.filterChange.emit({ ...this.filter(), ...change });
  }

  protected patchEventTypes(value: string[]) {
    const current = this.filter().eventTypes;
    if (value.length !== current.length || value.some(v => !current.includes(v))) {
      this.patch({ eventTypes: value });
    }
  }

  protected patchText(key: 'userEmail' | 'resourceId', value: string) {
    const next = value.trim() || undefined;
    if (next !== this.filter()[key]) {
      this.patch({ [key]: next });
    }
  }

  protected setRangeStart(value: Date | null, pickerOpened: boolean) {
    this.pendingFrom = value;
    if (!pickerOpened) {
      this.commitRange();
    }
  }

  protected setRangeEnd(value: Date | null, pickerOpened: boolean) {
    this.pendingTo = value;
    if (!pickerOpened) {
      this.commitRange();
    }
  }

  protected commitRange() {
    const f = this.filter();
    const from = this.pendingFrom === undefined ? f.from : (this.pendingFrom ?? undefined);
    const to = this.pendingTo === undefined ? f.to : (this.pendingTo ?? undefined);
    this.pendingFrom = undefined;
    this.pendingTo = undefined;

    if (from?.getTime() !== f.from?.getTime() || to?.getTime() !== f.to?.getTime()) {
      this.patch({ from, to });
    }
  }

  protected clearRange() {
    this.pendingFrom = undefined;
    this.pendingTo = undefined;
    this.patch({ from: undefined, to: undefined });
  }

  protected clear() {
    this.filterChange.emit({ eventTypes: [] });
  }
}
