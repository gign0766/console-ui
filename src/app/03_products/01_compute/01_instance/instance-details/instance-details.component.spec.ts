import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
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
import { of, throwError } from 'rxjs';

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
    devicesInterfaces?: { name: string; model?: string; state?: 'up' | 'down' }[];
    vmiInterfaces?: { name: string; ipAddresses?: string[]; linkState?: 'up' | 'down' }[];
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

  it('should display active/green chips when vmInterface is up and vmiInterface is up (Case A)', () => {
    const vmIface = component.getVmInterface('interface-0', 0);
    const vmiIface = component.getVmiInterface('interface-0', 0);

    expect(component.isInterfaceDesiredUp(vmIface)).toBeTrue();
    expect(vmiIface?.linkState).toBe('up');
    expect(component.getOperationalCarrierState(vmiIface)).toBe('Link Up');

    // Sync indicator should not be active for matching states
    expect(component.isLinkStateSyncing('interface-0', vmIface, vmiIface)).toBeFalse();
  });

  it('should display down/inactive chips when vmInterface is down and vmiInterface is down (Case B)', () => {
    const vmIface = component.getVmInterface('interface-1', 1);
    const vmiIface = component.getVmiInterface('interface-1', 1);

    expect(component.isInterfaceDesiredUp(vmIface)).toBeFalse();
    expect(vmiIface?.linkState).toBe('down');
    expect(component.getOperationalCarrierState(vmiIface)).toBe('Link Down');

    // Sync indicator should not be active for matching states
    expect(component.isLinkStateSyncing('interface-1', vmIface, vmiIface)).toBeFalse();
  });

  it('should display transient sync indicator when vmInterface is down and vmiInterface is up (Case C)', async () => {
    const mock = createMockInstance({
      devicesInterfaces: [
        { name: 'interface-0', model: 'virtio', state: 'down' },
        { name: 'interface-1', model: 'virtio', state: 'up' },
      ],
      vmiInterfaces: [
        { name: 'interface-0', ipAddresses: ['10.0.0.10'], linkState: 'up' },
        { name: 'interface-1', ipAddresses: ['10.0.1.10'], linkState: 'up' },
      ],
    });
    instanceSvc.get.and.returnValue(of(mock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    const vmIface = component.getVmInterface('interface-0', 0);
    const vmiIface = component.getVmiInterface('interface-0', 0);

    expect(component.isInterfaceDesiredUp(vmIface)).toBeFalse();
    expect(vmiIface?.linkState).toBe('up');
    expect(component.isLinkStateSyncing('interface-0', vmIface, vmiIface)).toBeTrue();
  });

  it('should display transient sync indicator when vmInterface is up and vmiInterface is down (Case D)', async () => {
    const mock = createMockInstance({
      devicesInterfaces: [
        { name: 'interface-0', model: 'virtio', state: 'up' },
        { name: 'interface-1', model: 'virtio', state: 'up' },
      ],
      vmiInterfaces: [
        { name: 'interface-0', ipAddresses: ['10.0.0.10'], linkState: 'down' },
        { name: 'interface-1', ipAddresses: ['10.0.1.10'], linkState: 'up' },
      ],
    });
    instanceSvc.get.and.returnValue(of(mock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    const vmIface = component.getVmInterface('interface-0', 0);
    const vmiIface = component.getVmiInterface('interface-0', 0);

    expect(component.isInterfaceDesiredUp(vmIface)).toBeTrue();
    expect(vmiIface?.linkState).toBe('down');
    expect(component.isLinkStateSyncing('interface-0', vmIface, vmiIface)).toBeTrue();
  });

  it('should gracefully indicate instance stopped when vmi is undefined', async () => {
    const stoppedMock = createMockInstance({ isVmiRunning: false });
    instanceSvc.get.and.returnValue(of(stoppedMock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isVmRunning()).toBeFalse();
    const vmIface = component.getVmInterface('interface-0', 0);
    const vmiIface = component.getVmiInterface('interface-0', 0);

    expect(component.isInterfaceDesiredUp(vmIface)).toBeTrue();
    expect(component.getOperationalCarrierState(vmiIface)).toBe('Instance stopped');
    expect(component.isLinkStateSyncing('interface-0', vmIface, vmiIface)).toBeFalse();
  });

  it('should deterministically match interfaces by name rather than array index', async () => {
    // Reverse devices and vmi interfaces so interface-1 is index 0
    const reversedMock = createMockInstance({
      devicesInterfaces: [
        { name: 'interface-1', model: 'e1000', state: 'down' },
        { name: 'interface-0', model: 'virtio', state: 'up' },
      ],
      vmiInterfaces: [
        { name: 'interface-1', ipAddresses: ['10.0.1.99'], linkState: 'down' },
        { name: 'interface-0', ipAddresses: ['10.0.0.99'], linkState: 'up' },
      ],
      networks: [
        { name: 'interface-0', subnetEid: 'subnet-eid-0' },
        { name: 'interface-1', subnetEid: 'subnet-eid-1' },
      ],
    });
    instanceSvc.get.and.returnValue(of(reversedMock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    const iface0 = component.getVmInterface('interface-0', 0);
    const iface1 = component.getVmInterface('interface-1', 1);

    expect(iface0?.name).toBe('interface-0');
    expect(iface0?.model).toBe('virtio');
    expect(iface0?.state).toBe('up');

    expect(iface1?.name).toBe('interface-1');
    expect(iface1?.model).toBe('e1000');
    expect(iface1?.state).toBe('down');

    const vmi0 = component.getVmiInterface('interface-0', 0);
    const vmi1 = component.getVmiInterface('interface-1', 1);

    expect(vmi0?.ipAddresses).toEqual(['10.0.0.99']);
    expect(vmi1?.ipAddresses).toEqual(['10.0.1.99']);
  });

  it('should resolve the toggled network by name when VM and VMI network arrays diverge', async () => {
    const divergentMock = createMockInstance();
    divergentMock.vmi!.spec!.networks = [
      {
        name: 'orphan-interface',
        multus: { networkName: `spx-${projectId}/orphan-subnet`, default: false },
      },
      {
        name: 'interface-1',
        multus: { networkName: `spx-${projectId}/subnet-eid-1`, default: false },
      },
      {
        name: 'interface-0',
        multus: { networkName: `spx-${projectId}/subnet-eid-0`, default: true },
      },
    ];
    instanceSvc.get.and.returnValue(of(divergentMock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();
    dialog.open.calls.reset();
    instanceSvc.update.calls.reset();

    const toggleSource = { checked: false };
    const mockToggleEvent = {
      checked: false,
      source: toggleSource,
    } as unknown as MatSlideToggleChange;

    component.toggleInterfaceLink('interface-0', false, mockToggleEvent);

    expect(dialog.open).toHaveBeenCalled();
    expect(instanceSvc.update).toHaveBeenCalled();
    expect(instanceSvc.update.calls.mostRecent().args[4].network).toEqual([
      jasmine.objectContaining({ order: 0, subnetEId: 'subnet-eid-0', enabled: false }),
      jasmine.objectContaining({ order: 1, subnetEId: 'subnet-eid-1', enabled: false }),
    ]);
  });

  it('should prompt confirmation dialog when toggling off primary interface (order 0)', () => {
    const mockToggleEvent = {
      checked: false,
      source: { checked: false },
    } as unknown as MatSlideToggleChange;

    component.toggleInterfaceLink('interface-0', false, mockToggleEvent);

    expect(dialog.open).toHaveBeenCalled();
    const dialogArgs = dialog.open.calls.mostRecent().args;
    expect(dialogArgs[1]?.data).toEqual(
      jasmine.objectContaining({
        title: 'Disable primary interface?',
        content:
          'Disabling the primary interface will disconnect default gateway connectivity. Remote access may be interrupted. Are you sure you want to proceed?',
      })
    );
    expect(instanceSvc.update).toHaveBeenCalled();
  });

  it('should revert toggle and not call update if primary interface disable is cancelled', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as ReturnType<MatDialog['open']>);

    const toggleSource = { checked: false };
    const mockToggleEvent = {
      checked: false,
      source: toggleSource,
    } as unknown as MatSlideToggleChange;

    component.toggleInterfaceLink('interface-0', false, mockToggleEvent);

    expect(dialog.open).toHaveBeenCalled();
    expect(instanceSvc.update).not.toHaveBeenCalled();
    expect(toggleSource.checked).toBeTrue();
  });

  it('should identify disabled primary interface with warning helper', () => {
    const vmIfaceDown = { name: 'interface-0', state: 'down' as const };
    const vmIfaceUp = { name: 'interface-0', state: 'up' as const };

    expect(component.isPrimaryInterfaceDisabled(0, vmIfaceDown)).toBeTrue();
    expect(component.isPrimaryInterfaceDisabled(0, vmIfaceUp)).toBeFalse();
    // Non-primary interface disabled should not trigger primary warning
    expect(component.isPrimaryInterfaceDisabled(1, vmIfaceDown)).toBeFalse();
  });

  it('should toggle secondary interface directly without prompt', () => {
    component.toggleInterfaceLink('interface-1', true);

    expect(dialog.open).not.toHaveBeenCalled();
    expect(instanceSvc.update).toHaveBeenCalledWith(
      orgId,
      projectId,
      az,
      eid,
      jasmine.objectContaining({
        network: [
          jasmine.objectContaining({ order: 0, enabled: true }),
          jasmine.objectContaining({ order: 1, enabled: true }),
        ],
      })
    );
    expect(snackbar.open).toHaveBeenCalledWith('Network interface link state updated', undefined, jasmine.any(Object));
  });

  it('should disable toggle when user lacks write permissions', () => {
    permissionsSignal.set([]);
    expect(component.canToggleLinkState()).toBeFalse();

    permissionsSignal.set([PermissionsEnum.ProjectInstanceWrite]);
    expect(component.canToggleLinkState()).toBeTrue();
  });

  it('should disable toggle when instance is gitops-managed or cluster resource', async () => {
    const gitopsMock = createMockInstance({ gitops: 'true' });
    instanceSvc.get.and.returnValue(of(gitopsMock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.canToggleLinkState()).toBeFalse();

    const clusterMock = createMockInstance({ isCluster: true });
    instanceSvc.get.and.returnValue(of(clusterMock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.canToggleLinkState()).toBeFalse();
  });

  it('should manage polling lifecycle when toggling link state on running instance', () => {
    jasmine.clock().install();
    try {
      component.toggleInterfaceLink('interface-1', true);
      expect(component.isUpdatingLinkState('interface-1')).toBeTrue();

      // Advance timers across polling attempts up to max attempts
      jasmine.clock().tick(7500);

      expect(component.isUpdatingLinkState('interface-1')).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('should stop polling early when carrier state reconciles with desired state', () => {
    jasmine.clock().install();
    try {
      const reconciledMock = createMockInstance({
        devicesInterfaces: [
          { name: 'interface-0', model: 'virtio', state: 'up' },
          { name: 'interface-1', model: 'virtio', state: 'up' },
        ],
        vmiInterfaces: [
          { name: 'interface-0', ipAddresses: ['10.0.0.10'], linkState: 'up' },
          { name: 'interface-1', ipAddresses: ['10.0.1.10'], linkState: 'up' },
        ],
      });
      instanceSvc.get.and.returnValue(of(reconciledMock));

      component.toggleInterfaceLink('interface-1', true);
      expect(component.isUpdatingLinkState('interface-1')).toBeTrue();

      // At 1500ms, the first poll tick executes. Because reconciledMock has linkState === 'up', polling completes early.
      jasmine.clock().tick(1500);

      expect(component.isUpdatingLinkState('interface-1')).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('should not start polling timer when VM is stopped', async () => {
    const stoppedMock = createMockInstance({ isVmiRunning: false });
    instanceSvc.get.and.returnValue(of(stoppedMock));
    component.reload();
    fixture.detectChanges();
    await fixture.whenStable();

    jasmine.clock().install();
    try {
      component.toggleInterfaceLink('interface-1', true);
      // Since VM is not running, stopPolling is called immediately and no timer is active
      expect(component.isUpdatingLinkState('interface-1')).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('should clean up updating state when instance update returns an error', () => {
    instanceSvc.update.and.returnValue(throwError(() => new Error('API update failure')));

    component.toggleInterfaceLink('interface-1', true);

    expect(component.isUpdatingLinkState('interface-1')).toBeFalse();
  });

  it('should clean up all active poll subscriptions on component destruction', () => {
    jasmine.clock().install();
    try {
      component.toggleInterfaceLink('interface-1', true);
      expect(component.isUpdatingLinkState('interface-1')).toBeTrue();

      component.ngOnDestroy();

      // Advancing timer after ngOnDestroy should not throw or cause unexpected behavior
      jasmine.clock().tick(5000);
    } finally {
      jasmine.clock().uninstall();
    }
  });
});
