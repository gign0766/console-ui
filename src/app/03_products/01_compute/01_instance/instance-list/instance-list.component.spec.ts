import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductInstance } from '@products/00_shared/models/product.model';
import { mapHandlerReplacer } from '@shared/utils/json-utils';

import { InstanceListComponent } from './instance-list.component';

describe('InstanceListComponent', () => {
  let component: InstanceListComponent;
  let fixture: ComponentFixture<InstanceListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstanceListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('filterPredicate', () => {
    const normalInstance = {
      data: {
        productName: 'web-server-prod',
        eid: 'spx-inst-12345',
        codeAZ: 'az-fr-1',
        vm: {
          kind: 'VirtualMachine',
          apiVersion: 'kubevirt.io/v1',
          metadata: { name: 'web-server-prod' },
          spec: {},
          status: {
            created: true,
            ready: true,
            printableStatus: 'Running',
          },
        },
      } as unknown as ProductInstance,
      isDR: false,
      isClusterInstance: false,
    };

    const downAzInstance = {
      data: {
        productName: 'db-backup-daily',
        eid: 'spx-inst-67890',
        codeAZ: 'az-fr-2',
        vm: undefined,
      } as unknown as ProductInstance,
      isDR: false,
      isClusterInstance: false,
    };

    function filterString(search?: string, az?: string, showCluster = true): string {
      const map = new Map<string, string>();
      if (search !== undefined) {
        map.set('search', search);
      }
      if (az !== undefined) {
        map.set('az', az);
      }
      map.set('showClusterInstance', showCluster ? 'true' : 'false');
      return JSON.stringify(map, mapHandlerReplacer);
    }

    it('should return true for all instances when search is empty', () => {
      const filter = filterString();
      const predicate = component['filterPredicate'];
      expect(predicate(normalInstance, filter)).toBeTrue();
      expect(predicate(downAzInstance, filter)).toBeTrue();
    });

    it('should match instances by productName', () => {
      const predicate = component['filterPredicate'];
      expect(predicate(normalInstance, filterString('web'))).toBeTrue();
      expect(predicate(downAzInstance, filterString('web'))).toBeFalse();

      expect(predicate(normalInstance, filterString('backup'))).toBeFalse();
      expect(predicate(downAzInstance, filterString('backup'))).toBeTrue();
    });

    it('should match instances by eid', () => {
      const predicate = component['filterPredicate'];
      expect(predicate(normalInstance, filterString('12345'))).toBeTrue();
      expect(predicate(downAzInstance, filterString('12345'))).toBeFalse();

      expect(predicate(normalInstance, filterString('67890'))).toBeFalse();
      expect(predicate(downAzInstance, filterString('67890'))).toBeTrue();
    });

    it('should match instances by status and handle unknown status when AZ is down', () => {
      const predicate = component['filterPredicate'];
      expect(predicate(normalInstance, filterString('running'))).toBeTrue();
      expect(predicate(downAzInstance, filterString('running'))).toBeFalse();

      expect(predicate(normalInstance, filterString('unknown'))).toBeFalse();
      expect(predicate(downAzInstance, filterString('unknown'))).toBeTrue();
    });

    it('should filter out instances from down AZ when search term does not match', () => {
      const predicate = component['filterPredicate'];
      expect(predicate(downAzInstance, filterString('nonexistent'))).toBeFalse();
      expect(predicate(normalInstance, filterString('nonexistent'))).toBeFalse();
    });

    it('should respect the AZ filter', () => {
      const predicate = component['filterPredicate'];
      expect(predicate(normalInstance, filterString(undefined, 'az-fr-1'))).toBeTrue();
      expect(predicate(normalInstance, filterString(undefined, 'az-fr-2'))).toBeFalse();
      expect(predicate(downAzInstance, filterString(undefined, 'az-fr-2'))).toBeTrue();
      expect(predicate(downAzInstance, filterString(undefined, 'az-fr-1'))).toBeFalse();
    });

    it('should filter out cluster instances when showClusterInstance is false', () => {
      const clusterInstance = {
        ...normalInstance,
        isClusterInstance: true,
      };
      const predicate = component['filterPredicate'];
      expect(predicate(clusterInstance, filterString(undefined, undefined, true))).toBeTrue();
      expect(predicate(clusterInstance, filterString(undefined, undefined, false))).toBeFalse();
    });
  });
});
