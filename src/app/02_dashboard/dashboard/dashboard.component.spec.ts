import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTROLLER_PATH, HTTP_PROTOCOL, environment } from '@env/environment';
import { ScreenService } from '@shared/services/screen.service';
import { StateService } from '@shared/services/state.service';

import { ProjectSummary } from '../dashboard.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const orgId = 'org1';
  const projectId = 'proj1';
  const summaryUrl = `${HTTP_PROTOCOL}${environment.apiUrl}/${orgId}${CONTROLLER_PATH}/${projectId}/summary`;

  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  const organization = signal<{ id: string } | undefined>(undefined);
  const project = signal<{ id: string } | undefined>(undefined);
  const azList = signal<{ code: string; name: string; logoUrl?: string }[]>([]);

  const stateSvcStub = { organization, project, azList };

  const isMobile = signal(false);
  const isWeb = signal(true);
  const screenSvcStub = { isMobile, isWeb, isTablet: signal(false) };

  /** A summary payload with everything empty, to be overridden per test. */
  function emptySummary(): ProjectSummary {
    return { counts: {}, countsByAz: {}, quota: { used: 0, limit: 0 }, recent: [] };
  }

  /**
   * Build the component, then flush the summary request with `summary` if one was made.
   * The request must be answered before the fixture is awaited, otherwise it is cancelled.
   */
  async function createComponent(summary?: ProjectSummary) {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    if (summary) {
      httpMock.expectOne(summaryUrl).flush(summary);
    }

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Inventory segment values as rendered, keyed by category name. */
  function renderedCards(): Record<string, string> {
    const cards: Record<string, string> = {};
    for (const segment of fixture.nativeElement.querySelectorAll('.dashboard__segment')) {
      const name = segment.querySelector('.dashboard__segment-name').textContent.trim();
      cards[name] = segment.querySelector('.dashboard__segment-value').textContent.trim();
    }
    return cards;
  }

  /** Text of a row, whitespace collapsed. */
  function rowText(row: Element): string {
    return row.textContent!.replace(/\s+/g, ' ').trim();
  }

  beforeEach(async () => {
    environment.announcement = undefined;
    organization.set(undefined);
    project.set(undefined);
    azList.set([]);
    isMobile.set(false);
    isWeb.set(true);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: StateService, useValue: stateSvcStub },
        { provide: ScreenService, useValue: screenSvcStub },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.announcement = undefined;
    httpMock.verify();
  });

  it('should create', async () => {
    await createComponent();
    expect(component).toBeTruthy();
  });

  describe('resource counts', () => {
    it('should not call the API when no project is selected', async () => {
      await createComponent();

      httpMock.expectNone(summaryUrl);
    });

    it('should fetch the summary once when an organization and a project are selected', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      // createComponent asserts a single request and answers it; nothing must follow it.
      await createComponent({ ...emptySummary(), counts: { instance: 3, disk: 5, vpc: 2, kaas: 1 } });

      httpMock.expectNone(summaryUrl);
    });

    it('should sum the product types of each category', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({
        ...emptySummary(),
        counts: {
          instance: 3,
          vmSnapshot: 1,
          disk: 5,
          snapshot: 2,
          baas: 0,
          bucket: 1,
          vpc: 2,
          subnet: 4,
          eip: 0,
          loadBalancer: 1,
          securityGroup: 3,
          kaas: 1,
        },
      });

      expect(renderedCards()).toEqual({
        Compute: '4',
        Storage: '8',
        Network: '10',
        PaaS: '1',
      });
    });

    it('should hide a category the user is not allowed to read', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({ ...emptySummary(), counts: { instance: 3, disk: 5, vpc: 2 } });

      const cards = renderedCards();
      expect(cards['PaaS']).toBeUndefined();
      expect(cards['Compute']).toBe('3');
    });

    it('should show a dash instead of a count when the request fails', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      fixture = TestBed.createComponent(DashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      httpMock.expectOne(summaryUrl).error(new ProgressEvent('error'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(Object.values(renderedCards())).toEqual(['—', '—', '—', '—']);
    });
  });

  describe('resource quota', () => {
    it('should show the quota usage and fill the meter', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({ ...emptySummary(), quota: { used: 42, limit: 200 } });

      const value = fixture.nativeElement.querySelector('.dashboard__quota-value');
      const bar = fixture.nativeElement.querySelector('.dashboard__quota-bar');
      expect(value.textContent.replace(/\s+/g, ' ').trim()).toBe('42 of 200 resources');
      expect(bar.getAttribute('aria-valuenow')).toBe('21');
      expect(fixture.nativeElement.querySelector('.dashboard__quota--near-limit')).toBeNull();
    });

    it('should highlight the meter once close to the limit', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({ ...emptySummary(), quota: { used: 171, limit: 200 } });

      expect(fixture.nativeElement.querySelector('.dashboard__quota--near-limit')).toBeTruthy();
    });

    it('should hide the quota when no limit is set', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({ ...emptySummary(), quota: { used: 0, limit: 0 } });

      expect(fixture.nativeElement.querySelector('.dashboard__quota')).toBeNull();
    });
  });

  describe('recently created', () => {
    it('should list the resources and link to their details page', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({
        ...emptySummary(),
        recent: [
          {
            id: 'id1',
            eid: 'eid1',
            productName: 'web-01',
            productType: 'instance',
            codeAz: 'az1',
            createdAt: '2026-09-01T10:00:00Z',
          },
          {
            id: 'id2',
            eid: 'eid2',
            productName: 'front-lb',
            productType: 'loadBalancer',
            codeAz: 'az2',
            createdAt: '2026-08-30T10:00:00Z',
          },
        ],
      });

      const rows = fixture.nativeElement.querySelectorAll('.dashboard__row');
      expect(rows[0].querySelector('.dashboard__row-name').textContent.trim()).toBe('web-01');
      expect(rows[0].getAttribute('href')).toBe('/products/compute/instance/details/az1/eid1');
      expect(rows[1].textContent).toContain('Load Balancer');
      expect(rows[1].getAttribute('href')).toBe('/products/network/load-balancer/details/az2/eid2');
      // The chevron is rendered on every row; CSS reveals it on hover.
      expect(rows[0].querySelector('.dashboard__row-chevron')).toBeTruthy();
    });

    it('should show the AZ logo, falling back to the AZ code', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });
      azList.set([{ code: 'az1', name: 'Zone 1', logoUrl: 'https://cdn.example.com/az1.svg' }]);

      await createComponent({
        ...emptySummary(),
        recent: [
          {
            id: 'id1',
            eid: 'eid1',
            productName: 'web-01',
            productType: 'instance',
            codeAz: 'az1',
            createdAt: '2026-09-01T10:00:00Z',
          },
          {
            id: 'id2',
            eid: 'eid2',
            productName: 'web-02',
            productType: 'instance',
            codeAz: 'az-unknown',
            createdAt: '2026-08-30T10:00:00Z',
          },
        ],
      });

      const rows = fixture.nativeElement.querySelectorAll('.dashboard__row');
      const logo = rows[0].querySelector('.dashboard__row-logo');
      expect(logo.getAttribute('src')).toBe('https://cdn.example.com/az1.svg');
      expect(logo.getAttribute('title')).toBe('az1');
      expect(rows[1].querySelector('.dashboard__row-logo')).toBeNull();
      expect(rowText(rows[1])).toContain('az-unknown');
    });

    it('should link a product without a details page to its list', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({
        ...emptySummary(),
        recent: [
          {
            id: 'id1',
            eid: 'eid1',
            productName: 'my-key',
            productType: 'ssh',
            codeAz: 'az1',
            createdAt: '2026-09-01T10:00:00Z',
          },
        ],
      });

      const row = fixture.nativeElement.querySelector('.dashboard__row');
      expect(row.getAttribute('href')).toBe('/products/uncategorized/ssh');
    });

    it('should invite creating a resource when there is none', async () => {
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent(emptySummary());

      const empty = fixture.nativeElement.querySelector('.dashboard__row-empty');
      expect(empty.textContent).toContain('No resources yet.');
      expect(empty.querySelector('a').getAttribute('href')).toBe('/products/compute/instance/create');
    });
  });

  describe('availability zones', () => {
    beforeEach(() => {
      organization.set({ id: orgId });
      project.set({ id: projectId });
      azList.set([
        { code: 'az1', name: 'Zone 1', logoUrl: 'https://cdn.example.com/az1.svg' },
        { code: 'az2', name: 'Zone 2' },
      ]);
    });

    it('should list only the zones the project has resources in, busiest first', async () => {
      await createComponent({ ...emptySummary(), countsByAz: { az2: 3, az1: 7 } });

      const rows = fixture.nativeElement.querySelectorAll('.dashboard__row');
      expect(rows.length).toBe(2);
      expect(rowText(rows[0])).toBe('Zone 1 7 resources');
      expect(rowText(rows[1])).toBe('Zone 2 3 resources');
    });

    it('should not list a zone the project has no resource in', async () => {
      await createComponent({ ...emptySummary(), countsByAz: { az1: 7 } });

      const rows = fixture.nativeElement.querySelectorAll('.dashboard__row');
      expect(rows.length).toBe(1);
      expect(rowText(rows[0])).toBe('Zone 1 7 resources');
    });

    it('should say resource in the singular for a single one', async () => {
      await createComponent({ ...emptySummary(), countsByAz: { az1: 1 } });

      expect(rowText(fixture.nativeElement.querySelector('.dashboard__row'))).toBe('Zone 1 1 resource');
    });

    it('should show the zone logo only when there is one', async () => {
      await createComponent({ ...emptySummary(), countsByAz: { az1: 7, az2: 3 } });

      const rows = fixture.nativeElement.querySelectorAll('.dashboard__row');
      const logo = rows[0].querySelector('.dashboard__row-logo');
      expect(logo.getAttribute('src')).toBe('https://cdn.example.com/az1.svg');
      expect(logo.getAttribute('title')).toBe('az1');
      expect(rows[1].querySelector('.dashboard__row-logo')).toBeNull();
    });

    it('should fall back to the code for a zone missing from the AZ list', async () => {
      await createComponent({ ...emptySummary(), countsByAz: { 'az-gone': 2 } });

      expect(rowText(fixture.nativeElement.querySelector('.dashboard__row'))).toBe('az-gone 2 resources');
    });

    it('should tell when no zone holds anything', async () => {
      await createComponent(emptySummary());

      const empty = fixture.nativeElement.querySelectorAll('.dashboard__row-empty');
      expect(empty[1].textContent).toContain('No resources in any zone yet.');
    });
  });

  describe('create shortcuts', () => {
    it('should offer a create page on every segment, even with no resource', async () => {
      await createComponent();

      const creates = fixture.nativeElement.querySelectorAll('.dashboard__segment-create');
      expect(creates.length).toBe(4);
      expect(creates[0].getAttribute('href')).toBe('/products/compute/instance/create');
      expect(creates[3].getAttribute('href')).toBe('/products/paas/kaas/create');
    });

    it('should keep the segment itself linking to the product list', async () => {
      await createComponent();

      const main = fixture.nativeElement.querySelector('.dashboard__segment-main');
      expect(main.getAttribute('href')).toBe('/products/compute/instance');
    });
  });

  describe('narrow screens', () => {
    it('should stack the categories below desktop widths', async () => {
      isWeb.set(false);

      await createComponent();

      expect(fixture.nativeElement.querySelector('.dashboard__inventory--stacked')).toBeTruthy();
    });

    it('should keep the categories in a row on desktop', async () => {
      await createComponent();

      expect(fixture.nativeElement.querySelector('.dashboard__inventory--stacked')).toBeNull();
    });

    it('should drop the product type from the recent rows on a phone', async () => {
      isMobile.set(true);
      organization.set({ id: orgId });
      project.set({ id: projectId });

      await createComponent({
        ...emptySummary(),
        recent: [
          {
            id: 'id1',
            eid: 'eid1',
            productName: 'web-01',
            productType: 'instance',
            codeAz: 'az1',
            createdAt: '2026-09-01T10:00:00Z',
          },
        ],
      });

      expect(fixture.nativeElement.querySelector('.dashboard__row--compact')).toBeTruthy();
      // The changelog rail is dropped rather than reflowed on a phone.
      expect(fixture.nativeElement.querySelector('spx-changelog')).toBeNull();
    });
  });

  describe('announcement', () => {
    it('should not show announcement block when no announcement is configured', async () => {
      await createComponent();

      const announcement = fixture.nativeElement.querySelector('.banner');
      expect(announcement).toBeNull();
    });

    it('should show the announcement block with its long text and severity', async () => {
      environment.announcement = { text: 'Short text', longText: 'Detailed long text', severity: 'error' };

      await createComponent();

      const banner = fixture.nativeElement.querySelector('.banner');
      expect(banner.querySelector('.banner__content').textContent).toContain('Detailed long text');
      expect(banner.classList).toContain('banner--error');
    });

    it('should fall back to text when longText is not provided', async () => {
      environment.announcement = { text: 'Short text only', severity: 'info' };

      await createComponent();

      const banner = fixture.nativeElement.querySelector('.banner');
      expect(banner.querySelector('.banner__content').textContent).toContain('Short text only');
      expect(banner.classList).toContain('banner--info');
    });
  });
});
