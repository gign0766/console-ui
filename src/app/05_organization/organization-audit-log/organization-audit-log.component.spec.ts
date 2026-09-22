import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';

import { auditLogStateFromParams, auditLogStateToParams } from './audit-log-query-params';
import { OrganizationAuditLogComponent } from './organization-audit-log.component';

describe('OrganizationAuditLogComponent', () => {
  let component: OrganizationAuditLogComponent;
  let fixture: ComponentFixture<OrganizationAuditLogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationAuditLogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationAuditLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should go back to the first page when a filter changes', () => {
    component.pageIndex.set(3);
    component.updateFilter({ eventTypes: [], status: 'failed' });
    expect(component.pageIndex()).toBe(0);
  });

  it('should go back to the first page when the page size changes', () => {
    component.pageIndex.set(3);
    component.updatePage({ pageIndex: 3, pageSize: 50, length: 500 });
    expect(component.pageIndex()).toBe(0);
    expect(component.pageSize()).toBe(50);
  });
});

describe('audit log query params', () => {
  const cases = [
    {
      name: 'empty URL gives the defaults',
      params: {},
      expected: { filter: { eventTypes: [] }, pageIndex: 0, pageSize: 25 },
    },
    {
      name: 'filters and page are read back',
      params: { eventType: ['disk.create', 'disk.delete'], status: 'failed', from: '2026-09-01', page: '3', size: '50' },
      expected: {
        filter: { eventTypes: ['disk.create', 'disk.delete'], status: 'failed', from: new Date(2026, 8, 1) },
        pageIndex: 2,
        pageSize: 50,
      },
    },
    {
      name: 'invalid values are ignored',
      params: { status: 'nope', from: 'yesterday', page: '-4', size: '7' },
      expected: { filter: { eventTypes: [] }, pageIndex: 0, pageSize: 25 },
    },
  ];

  cases.forEach(({ name, params, expected }) => {
    it(name, () => {
      const state = auditLogStateFromParams(convertToParamMap(params));
      // Drops undefined keys before comparing
      expect(JSON.parse(JSON.stringify(state))).toEqual(JSON.parse(JSON.stringify(expected)));
    });
  });

  it('should round-trip a state through the URL', () => {
    const state = {
      filter: { eventTypes: ['vpc.update'], projectId: 'p1', to: new Date(2026, 8, 21) },
      pageIndex: 1,
      pageSize: 100,
    };
    const params = auditLogStateToParams(state);
    expect(params['to']).toBe('2026-09-21');
    expect(params['page']).toBe(2);

    const stringified = Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, Array.isArray(v) ? v : String(v)])
    );
    const back = auditLogStateFromParams(convertToParamMap(stringified));
    expect(JSON.parse(JSON.stringify(back))).toEqual(JSON.parse(JSON.stringify(state)));
  });
});
