import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { RunStrategy } from '@products/00_shared/models/compute/instance/enums/run-strategy.enum';
import { ProductInstance, ProductSSH, ProductSubnet } from '@products/00_shared/models/product.model';
import { InstanceSnapshotService } from '@products/00_shared/services/instance-snapshot.service';
import { InstanceService } from '@products/00_shared/services/instance.service';
import { SshService } from '@products/00_shared/services/ssh.service';
import { SubnetService } from '@products/00_shared/services/subnet.service';
import { APP_NAME_CLUSTER_LABEL_VALUE, APP_NAME_LABEL_KEY } from '@shared/models/consts';
import { PermissionsEnum } from '@shared/models/permissions/permission.enum';
import { PermissionService } from '@shared/services/permission.service';
import { StateService } from '@shared/services/state.service';
import { of } from 'rxjs';

import { InstanceDetailsComponent } from './instance-details.component';

describe('InstanceDetailsComponent', () => {
  const orgId = 'org-1';
  const projectId = 'proj-1';
  const az = 'az1';
  const eid = 'inst-eid-1';

  let fixture: ComponentFixture<InstanceDetailsComponent>;
  let component: InstanceDetailsComponent;
  let instanceSvc: jasmine.SpyObj<InstanceService>;
  let subnetSvc: jasmine.SpyObj<SubnetService>;
  let sshSvc: jasmine.SpyObj<SshService>;
  let snapshotSvc: jasmine.SpyObj<InstanceSnapshotService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackbar: jasmine.SpyObj<MatSnackBar>;
  let permissionsSignal: ReturnType<typeof signal<string[]>>;

  function createMockInstance(options?: {
    devicesInterfaces?: { name: string; model?: string; state?: 'up' | 'down'; macAddress?: string }[];
    vmiInterfaces?: { name: string; ipAddresses?: string[]; linkState?: 'up' | 'down'; mac?: string }[];
    networks?: { name: string; subnetEid: string }[];
    isVmiRunning?: boolean;
    gitops?: string;
    isCluster?: boolean;
  }): ProductInstance {
    const devicesInterfaces = options?.devicesInterfaces ?? [
      { name: 'interface-0', model: 'virtio', state: 'up' },
      { name: 'interface-1', model: 'virtio', state: 'down' },
    ];
    const networks = options?.networks ?? [
      { name: 'interface-0', subnetEid: 'subnet-eid-0' },
      { name: 'interface-1', subnetEid: 'subnet-eid-1' },
    ];
    const vmiInterfaces = options?.vmiInterfaces ?? [
      { name: 'interface-0', ipAddresses: ['10.0.0.10'], linkState: 'up' },
      { name: 'interface-1', ipAddresses: ['10.0.1.10'], linkState: 'down' },
    ];

    const isRunning = options?.isVmiRunning ?? true;

    return {
      id: 'inst-1',
      eid,
      productName: 'test-instance',
      codeAZ: az,
      gitops: options?.gitops ?? 'false',
      vm: {
        metadata: {
          name: 'test-instance',
          labels: options?.isCluster ? { [APP_NAME_LABEL_KEY]: APP_NAME_CLUSTER_LABEL_VALUE } : {},
          annotations: {
            'subnet-eid-0.spx-proj-1.ovn.kubernetes.io/ip_address': '10.0.0.10',
            'subnet-eid-1.spx-proj-1.ovn.kubernetes.io/ip_address': '10.0.1.10',
          },
        },
        spec: {
          runStrategy: RunStrategy.Manual,
          preference: { name: 'c1.small' },
          template: {
            metadata: {
              annotations: {
                'subnet-eid-0.spx-proj-1.ovn.kubernetes.io/ip_address': '10.0.0.10',
                'subnet-eid-1.spx-proj-1.ovn.kubernetes.io/ip_address': '10.0.1.10',
              },
            },
            spec: {
              domain: {
                cpu: { cores: 2 },
                memory: { guest: '4Gi' },
                devices: {
                  disks: [],
                  interfaces: devicesInterfaces,
                },
              },
              networks: networks.map(n => ({
                name: n.name,
                multus: { networkName: `spx-${projectId}/${n.subnetEid}` },
              })),
            },
          },
        },
      },
      vmi: isRunning
        ? {
            status: {
              phase: 'Running',
              interfaces: vmiInterfaces,
            },
            spec: {
              domain: {
                devices: {
                  interfaces: devicesInterfaces,
                },
              },
              networks: networks.map(n => ({
                name: n.name,
                multus: { networkName: `spx-${projectId}/${n.subnetEid}` },
              })),
            },
          }
        : undefined,
    } as unknown as ProductInstance;
  }

  beforeEach(async () => {
    permissionsSignal = signal<string[]>([PermissionsEnum.ProjectInstanceWrite]);

    instanceSvc = jasmine.createSpyObj<InstanceService>('InstanceService', ['get', 'update']);
    instanceSvc.get.and.returnValue(of(createMockInstance()));
    instanceSvc.update.and.returnValue(of({}));

    subnetSvc = jasmine.createSpyObj<SubnetService>('SubnetService', ['get']);
    subnetSvc.get.and.returnValue(
      of({
        id: 'sub-0',
        eid: 'subnet-eid-0',
        productName: 'subnet-0',
        subnet: { spec: { cidrBlock: '10.0.0.0/24' } },
      } as ProductSubnet)
    );

    sshSvc = jasmine.createSpyObj<SshService>('SshService', ['get']);
    sshSvc.get.and.returnValue(of({} as ProductSSH));

    snapshotSvc = jasmine.createSpyObj<InstanceSnapshotService>('InstanceSnapshotService', ['list']);

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    snackbar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [InstanceDetailsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: InstanceService, useValue: instanceSvc },
        { provide: SubnetService, useValue: subnetSvc },
        { provide: SshService, useValue: sshSvc },
        { provide: InstanceSnapshotService, useValue: snapshotSvc },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackbar },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ az, id: eid }),
            fragment: of('2'),
          },
        },
        {
          provide: PermissionService,
          useValue: { permissions: permissionsSignal },
        },
        {
          provide: StateService,
          useValue: {
            organization: signal({ id: orgId }),
            project: signal({ id: projectId }),
            azList: signal([]),
          },
        },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    fixture = TestBed.createComponent(InstanceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and load instance details', () => {
    expect(component).toBeTruthy();
    expect(component.instanceProduct.hasValue()).toBeTrue();
  });

  it('should build networkSubnetsMap correctly from networks and subnetsProduct', () => {
    const map = component.networkSubnetsMap();
    expect(map.has('interface-0')).toBeTrue();
    const sub0 = map.get('interface-0');
    expect(sub0?.eid).toBe('subnet-eid-0');
  });

  it('should render the network subcomponent in the template', () => {
    const networkComp = fixture.nativeElement.querySelector('spx-instance-details-network');
    expect(networkComp).toBeTruthy();
  });

  it('should reload instance details when reload is invoked', async () => {
    instanceSvc.get.calls.reset();
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(instanceSvc.get).toHaveBeenCalled();
  });
});
