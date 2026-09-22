import { AuditEvent, AuditEventType, AuditStatus } from '@shared/services/audit-log.service';

/** Label of an event type: resource label plus action. */
export function auditEventLabel(type: AuditEventType): string {
  return `${type.resourceLabel} ${type.action}`;
}

/** Labels of an event. Unknown types keep their raw identifiers. */
export interface AuditEventDisplay {
  label: string;
  resourceLabel: string;
}

export function auditEventDisplay(
  event: Pick<AuditEvent, 'eventType' | 'resourceType'>,
  types: ReadonlyMap<string, AuditEventType>
): AuditEventDisplay {
  const type = types.get(event.eventType);
  return type
    ? { label: auditEventLabel(type), resourceLabel: type.resourceLabel }
    : { label: event.eventType, resourceLabel: event.resourceType };
}

/** Event types keyed by identifier. */
export function auditEventTypeMap(types: AuditEventType[]): Map<string, AuditEventType> {
  return new Map(types.map(t => [t.eventType, t]));
}

/** The event types of one resource. */
export interface AuditEventGroup {
  resourceType: string;
  resourceLabel: string;
  events: AuditEventType[];
}

/** Groups event types by resource, in API order. */
export function auditEventGroups(types: AuditEventType[]): AuditEventGroup[] {
  const groups = new Map<string, AuditEventGroup>();
  for (const type of types) {
    let group = groups.get(type.resourceType);
    if (!group) {
      group = { resourceType: type.resourceType, resourceLabel: type.resourceLabel, events: [] };
      groups.set(type.resourceType, group);
    }
    group.events.push(type);
  }
  return [...groups.values()];
}

export const AUDIT_STATUSES: AuditStatus[] = ['success', 'failed', 'attempted'];

export function auditStatusChip(status: AuditStatus): { cls: string; label: string } {
  switch (status) {
    case 'success':
      return { cls: 'status-chip--completed', label: 'Success' };
    case 'failed':
      return { cls: 'status-chip--error', label: 'Failed' };
    default:
      return { cls: 'status-chip--info', label: 'Attempted' };
  }
}

// The API accepts at most 50 `eventType` values.
export const AUDIT_MAX_EVENT_TYPES = 50;
