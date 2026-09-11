import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CONTROLLER_PATH, HTTP_PROTOCOL, environment } from '@env/environment';
import { defaultOnceHandler } from '@shared/http/customHandler';

/** One recently created resource, as returned by the summary endpoint. */
export interface RecentProduct {
  id: string;
  eid: string;
  productName: string;
  productType: string;
  codeAz: string;
  createdAt: string;
}

/** How much of the project product creation quota is used. */
export interface ProjectQuota {
  used: number;
  limit: number;
}

/**
 * Resource overview of a project.
 *
 * Only the product types the user is allowed to read are present in `counts`: a missing key means
 * "not allowed to know", which is not the same as a count of 0. Those types are left out of
 * `countsByAz` and `recent` as well. `quota.used` counts every type, the way the quota is enforced.
 */
export interface ProjectSummary {
  counts: Record<string, number>;
  countsByAz: Record<string, number>;
  quota: ProjectQuota;
  recent: RecentProduct[];
}

/**
 * Project-wide summary used by the dashboard.
 *
 * This is not a Product service, so it does not extend BaseService, but it targets the same
 * controller path.
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  /**
   * Get the resource overview of a project, in a single request.
   * Note that GitOps-managed resources are not reported by the API.
   */
  getSummary(orgId: string, projectId: string) {
    return this.http
      .get<ProjectSummary>(`${HTTP_PROTOCOL}${environment.apiUrl}/${orgId}${CONTROLLER_PATH}/${projectId}/summary`)
      .pipe(defaultOnceHandler());
  }
}
