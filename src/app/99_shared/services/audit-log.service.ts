import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_ENDPOINT, HTTP_PROTOCOL, environment } from '@env/environment';
import { Observable, map } from 'rxjs';
import { defaultOnceHandler } from '../http/customHandler';

export type AuditStatus = 'attempted' | 'success' | 'failed';

export interface AuditEvent {
  id: string;
  organizationId?: string;
  projectId?: string;
  eventType: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  authType?: string;
  sourceIp: string;
  status: AuditStatus;
  statusCode?: number;
  requestId: string;
  startedAt: Date;
  completedAt?: Date;
}

/** An event type the API can write. */
export interface AuditEventType {
  eventType: string;
  resourceType: string;
  resourceLabel: string;
  action: string;
}

/** Reserved `eventType` filter value matching every retired event type. */
export const AUDIT_OTHER_EVENT_TYPE = 'other';

export interface AuditEventPage {
  items: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditRetention {
  retentionDays: number;
  isDefault: boolean;
  defaultDays: number;
  minDays: number;
  maxDays: number;
}

// Platform-wide, read-only
export interface UserAuditRetention {
  retentionDays: number;
}

export interface AuditLogFilter {
  eventTypes: string[];
  resourceType?: string;
  resourceId?: string;
  userEmail?: string;
  projectId?: string;
  status?: AuditStatus;
  from?: Date;
  to?: Date;
}

export interface AuditLogQuery extends AuditLogFilter {
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  protected http = inject(HttpClient);

  private getBaseUrl() {
    return `${HTTP_PROTOCOL}${environment.apiUrl}${API_ENDPOINT}`;
  }

  listOrganization(orgId: string, query: AuditLogQuery): Observable<AuditEventPage> {
    return this.list(`${this.getBaseUrl()}/organization/${orgId}/audit-log`, query);
  }

  /** The caller's own events outside any organization: logins, API tokens... */
  listUser(query: AuditLogQuery): Observable<AuditEventPage> {
    return this.list(`${this.getBaseUrl()}/user/audit-log`, query);
  }

  /** Event types of an organization log. Static per API version. */
  listOrganizationEventTypes(orgId: string): Observable<AuditEventType[]> {
    return this.listEventTypes(`${this.getBaseUrl()}/organization/${orgId}/audit-log/event-types`);
  }

  /** Event types of the caller's own log. */
  listUserEventTypes(): Observable<AuditEventType[]> {
    return this.listEventTypes(`${this.getBaseUrl()}/user/audit-log/event-types`);
  }

  getUserRetention(): Observable<UserAuditRetention> {
    return this.http
      .get<UserAuditRetention>(`${this.getBaseUrl()}/user/audit-log/retention`)
      .pipe(defaultOnceHandler());
  }

  getRetention(orgId: string): Observable<AuditRetention> {
    return this.http
      .get<AuditRetention>(`${this.getBaseUrl()}/organization/${orgId}/audit-log/retention`)
      .pipe(defaultOnceHandler());
  }

  /** `null` restores the platform default. */
  updateRetention(orgId: string, retentionDays: number | null): Observable<AuditRetention> {
    return this.http
      .post<AuditRetention>(`${this.getBaseUrl()}/organization/${orgId}/audit-log/retention`, { retentionDays })
      .pipe(defaultOnceHandler());
  }

  private listEventTypes(url: string): Observable<AuditEventType[]> {
    return this.http.get<{ items: AuditEventType[] }>(url).pipe(
      defaultOnceHandler(),
      map(res => res.items ?? [])
    );
  }

  private list(url: string, query: AuditLogQuery): Observable<AuditEventPage> {
    return this.http.get<AuditEventPage>(url, { params: this.buildParams(query) }).pipe(
      defaultOnceHandler(),
      map(page => ({
        ...page,
        items: (page.items ?? []).map(e => ({
          ...e,
          startedAt: new Date(e.startedAt),
          completedAt: e.completedAt ? new Date(e.completedAt) : undefined,
        })),
      }))
    );
  }

  private buildParams(query: AuditLogQuery): HttpParams {
    let params = new HttpParams().set('limit', query.limit).set('offset', query.offset);

    query.eventTypes.forEach(type => (params = params.append('eventType', type)));

    const values: Record<string, string | undefined> = {
      resourceType: query.resourceType,
      resourceId: query.resourceId,
      userEmail: query.userEmail,
      projectId: query.projectId,
      status: query.status,
      from: query.from?.toISOString(),
      to: query.to ? this.endOfDay(query.to).toISOString() : undefined,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
      }
    });

    return params;
  }

  // `to` is inclusive and covers the whole selected day
  private endOfDay(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
