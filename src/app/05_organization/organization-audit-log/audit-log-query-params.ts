import { ParamMap, Params } from '@angular/router';
import { AUDIT_DEFAULT_PAGE_SIZE, AUDIT_PAGE_SIZES } from '@shared/components/audit-log-table/audit-log-table.component';
import { AUDIT_MAX_EVENT_TYPES, AUDIT_STATUSES } from '@shared/models/data/audit-log';
import { AuditLogFilter, AuditStatus } from '@shared/services/audit-log.service';

export interface AuditLogViewState {
  filter: AuditLogFilter;
  pageIndex: number;
  pageSize: number;
}

/** View state from the URL. Invalid values fall back to defaults. */
export function auditLogStateFromParams(params: ParamMap): AuditLogViewState {
  const status = params.get('status') as AuditStatus | null;
  const page = Number(params.get('page'));
  const size = Number(params.get('size'));

  return {
    filter: {
      eventTypes: params.getAll('eventType').slice(0, AUDIT_MAX_EVENT_TYPES),
      resourceType: params.get('resourceType') || undefined,
      resourceId: params.get('resourceId') || undefined,
      userEmail: params.get('userEmail') || undefined,
      projectId: params.get('projectId') || undefined,
      status: status && AUDIT_STATUSES.includes(status) ? status : undefined,
      from: parseDay(params.get('from')),
      to: parseDay(params.get('to')),
    },
    // 1-based in the URL
    pageIndex: Number.isInteger(page) && page > 1 ? page - 1 : 0,
    pageSize: AUDIT_PAGE_SIZES.includes(size) ? size : AUDIT_DEFAULT_PAGE_SIZE,
  };
}

/** Default values are omitted from the URL. */
export function auditLogStateToParams(state: AuditLogViewState): Params {
  const f = state.filter;
  return {
    eventType: f.eventTypes.length ? f.eventTypes : undefined,
    resourceType: f.resourceType,
    resourceId: f.resourceId,
    userEmail: f.userEmail,
    projectId: f.projectId,
    status: f.status,
    from: formatDay(f.from),
    to: formatDay(f.to),
    page: state.pageIndex > 0 ? state.pageIndex + 1 : undefined,
    size: state.pageSize !== AUDIT_DEFAULT_PAGE_SIZE ? state.pageSize : undefined,
  };
}

// Local calendar days, formatted `2026-09-21`
function parseDay(value: string | null): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) {
    return undefined;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return isNaN(date.getTime()) ? undefined : date;
}

function formatDay(date: Date | undefined): string | undefined {
  if (!date) {
    return undefined;
  }
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
