import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { provideRouter } from '@angular/router';
import { CreateInstanceNetwork } from '@products/00_shared/models/compute/instance/instance';
import { ProductSubnet } from '@products/00_shared/models/product.model';
import { SubnetService } from '@products/00_shared/services/subnet.service';
import { ConfirmDialog } from '@shared/dialogs/confirm-dialog/confirm-dialog.component';
import { Organization, Project } from '@shared/models/data/organization';
import { StateService } from '@shared/services/state.service';
import { of, Subject } from 'rxjs';
import { InstanceNetworkCreateComponent } from './instance-network-create.component';

describe('InstanceNetworkCreateComponent', () => {
  let component: InstanceNetworkCreateComponent;
  let fixture: ComponentFixture<InstanceNetworkCreateComponent>;
  let subnetSvcSpy: jasmine.SpyObj<SubnetService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let stateSvc: StateService;

  const mockSubnet1: ProductSubnet = {
    id: 'subnet-1',
    eid: 'subnet-eid-1',
    productName: 'Subnet 1',
    subnet: {
      spec: {
        cidrBlock: '10.0.0.0/24',
        protocol: 'IPv4',
      },
    },
  } as unknown as ProductSubnet;

  const mockSubnet2: ProductSubnet = {
    id: 'subnet-2',
    eid: 'subnet-eid-2',
    productName: 'Subnet 2',
    subnet: {
      spec: {
        cidrBlock: '10.0.1.0/24',
        protocol: 'Dual',
      },
    },
  } as unknown as ProductSubnet;

  beforeEach(async () => {
    subnetSvcSpy = jasmine.createSpyObj('SubnetService', ['listByAZ']);
    subnetSvcSpy.listByAZ.and.returnValue(of([mockSubnet1, mockSubnet2]));

    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);

    await TestBed.configureTestingModule({
      imports: [InstanceNetworkCreateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: SubnetService, useValue: subnetSvcSpy },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    stateSvc = TestBed.inject(StateService);
    stateSvc.organization.set({ id: 'org-1' } as unknown as Organization);
    stateSvc.project.set({ id: 'proj-1' } as unknown as Project);

    fixture = TestBed.createComponent(InstanceNetworkCreateComponent);
    fixture.componentRef.setInput('az', 'az-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with existing networks from initList having enabled: true and enabled: false', async () => {
    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    const initNetworks: CreateInstanceNetwork[] = [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: true, ipv4: '10.0.0.15' },
      { order: 1, subnetEId: 'subnet-eid-2', enabled: false, model: 'virtio' },
    ];

    fixture.componentRef.setInput('initList', initNetworks);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.networkList.length).toBe(2);
    expect(component.isInterfaceEnabled('subnet-1')).toBe(true);
    expect(component.isInterfaceEnabled('subnet-2')).toBe(false);
    expect(emittedNetworks).toBeDefined();
    expect(emittedNetworks?.[0].enabled).toBe(true);
    expect(emittedNetworks?.[1].enabled).toBe(false);
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(false);
  });

  it('should default enabled to true when initList interface has omitted enabled property', async () => {
    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    const legacyNetworks: CreateInstanceNetwork[] = [{ order: 0, subnetEId: 'subnet-eid-1' }];

    fixture.componentRef.setInput('initList', legacyNetworks);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isInterfaceEnabled('subnet-1')).toBe(true);
    expect(emittedNetworks?.[0].enabled).toBe(true);
  });

  it('should default newly added subnets in addItem() to enabled: true', async () => {
    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    component.subnetSelected().setValue(mockSubnet1);
    component.addItem();
    fixture.detectChanges();

    expect(component.networkList.length).toBe(1);
    expect(component.isInterfaceEnabled('subnet-1')).toBe(true);
    expect(emittedNetworks?.[0].enabled).toBe(true);
  });

  it('should toggle secondary interface (order: 1) without opening ConfirmDialog', async () => {
    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    fixture.componentRef.setInput('initList', [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: true },
      { order: 1, subnetEId: 'subnet-eid-2', enabled: true },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // Toggle secondary interface (order: 1) to off
    component.formIps.get(['subnet-2', 'enabled'])?.setValue(false);
    component.onToggleEnabled(1, 'subnet-2', { checked: false } as MatSlideToggleChange);
    fixture.detectChanges();

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(component.isInterfaceEnabled('subnet-2')).toBe(false);
    expect(emittedNetworks?.[1].enabled).toBe(false);
  });

  it('should open ConfirmDialog when toggling off primary interface (order: 0)', async () => {
    fixture.componentRef.setInput('initList', [{ order: 0, subnetEId: 'subnet-eid-1', enabled: true }]);
    fixture.detectChanges();
    await fixture.whenStable();

    component.formIps.get(['subnet-1', 'enabled'])?.setValue(false);
    component.onToggleEnabled(0, 'subnet-1', { checked: false } as MatSlideToggleChange);

    expect(dialogSpy.open).toHaveBeenCalledWith(
      ConfirmDialog,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          title: 'Disable primary interface?',
          content:
            'Disabling the primary interface will disconnect default gateway connectivity. Remote access may be interrupted. Are you sure you want to proceed?',
          confirmBtn: 'Disable',
          cancelBtn: 'Cancel',
        }),
      })
    );
  });

  it('should revert primary interface toggle to enabled: true when user cancels ConfirmDialog', async () => {
    const afterClosedSubject = new Subject<boolean>();
    dialogSpy.open.and.returnValue({
      afterClosed: () => afterClosedSubject.asObservable(),
    } as ReturnType<MatDialog['open']>);

    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    fixture.componentRef.setInput('initList', [{ order: 0, subnetEId: 'subnet-eid-1', enabled: true }]);
    fixture.detectChanges();
    await fixture.whenStable();

    // User toggles primary off
    component.formIps.get(['subnet-1', 'enabled'])?.setValue(false);
    component.onToggleEnabled(0, 'subnet-1', { checked: false } as MatSlideToggleChange);

    // Cancel dialog
    afterClosedSubject.next(false);
    afterClosedSubject.complete();
    fixture.detectChanges();

    expect(component.isInterfaceEnabled('subnet-1')).toBe(true);
    expect(emittedNetworks?.[0].enabled).toBe(true);
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(false);
  });

  it('should disable primary interface and show warning badge when user confirms ConfirmDialog', async () => {
    const afterClosedSubject = new Subject<boolean>();
    dialogSpy.open.and.returnValue({
      afterClosed: () => afterClosedSubject.asObservable(),
    } as ReturnType<MatDialog['open']>);

    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    fixture.componentRef.setInput('initList', [{ order: 0, subnetEId: 'subnet-eid-1', enabled: true }]);
    fixture.detectChanges();
    await fixture.whenStable();

    // User toggles primary off
    component.formIps.get(['subnet-1', 'enabled'])?.setValue(false);
    component.onToggleEnabled(0, 'subnet-1', { checked: false } as MatSlideToggleChange);

    // Confirm dialog
    afterClosedSubject.next(true);
    afterClosedSubject.complete();
    fixture.detectChanges();

    expect(component.isInterfaceEnabled('subnet-1')).toBe(false);
    expect(emittedNetworks?.[0].enabled).toBe(false);
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(true);

    const warningBadge = fixture.nativeElement.querySelector('.warning-badge');
    expect(warningBadge).toBeTruthy();
    expect(warningBadge.textContent).toContain('Primary interface disabled');
  });

  it('should allow re-enabling disabled primary interface without confirmation dialog', async () => {
    fixture.componentRef.setInput('initList', [{ order: 0, subnetEId: 'subnet-eid-1', enabled: false }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(true);

    // Re-enable primary interface
    component.formIps.get(['subnet-1', 'enabled'])?.setValue(true);
    component.onToggleEnabled(0, 'subnet-1', { checked: true } as MatSlideToggleChange);
    fixture.detectChanges();

    expect(dialogSpy.open).not.toHaveBeenCalled();
    expect(component.isInterfaceEnabled('subnet-1')).toBe(true);
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(false);
  });

  it('should display warning badge on order: 0 when disabled interface is reordered to position 0 via drag-and-drop', async () => {
    fixture.componentRef.setInput('initList', [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: true },
      { order: 1, subnetEId: 'subnet-eid-2', enabled: false },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // Subnet 1 is at index 0 (enabled), subnet 2 is at index 1 (disabled)
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(false);
    expect(component.isPrimaryInterfaceDisabled('subnet-2')).toBe(false);

    // Reorder: move subnet 2 to index 0
    component.drop({ previousIndex: 1, currentIndex: 0 } as unknown as CdkDragDrop<ProductSubnet[]>);
    fixture.detectChanges();

    expect(component.networkList[0].id).toBe('subnet-2');
    expect(component.isPrimaryInterfaceDisabled('subnet-2')).toBe(true);
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(false);

    const warningBadge = fixture.nativeElement.querySelector('.warning-badge');
    expect(warningBadge).toBeTruthy();
    expect(warningBadge.textContent).toContain('Primary interface disabled');

    // Toggling the new primary (subnet-2) off when already off or on when toggling subnet-1
    // Now subnet-1 is at index 1 (enabled). Toggling subnet-1 off does NOT trigger dialog:
    component.formIps.get(['subnet-1', 'enabled'])?.setValue(false);
    component.onToggleEnabled(1, 'subnet-1', { checked: false } as MatSlideToggleChange);
    expect(dialogSpy.open).not.toHaveBeenCalled();

    // Now drag subnet-1 back to index 0 (disabled)
    component.drop({ previousIndex: 1, currentIndex: 0 } as unknown as CdkDragDrop<ProductSubnet[]>);
    fixture.detectChanges();
    expect(component.networkList[0].id).toBe('subnet-1');
    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBe(true);
  });

  it('should keep inputs visible and intact when interface is disabled (spec preservation)', async () => {
    fixture.componentRef.setInput('initList', [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: true, ipv4: '10.0.0.50', model: 'virtio' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // Confirm inputs are populated
    expect(component.formIps.get(['subnet-1', 'v4'])?.value).toBe('10.0.0.50');
    expect(component.formIps.get(['subnet-1', 'model'])?.value).toBe('virtio');

    // Disable interface
    component.formIps.get(['subnet-1', 'enabled'])?.setValue(false);
    fixture.detectChanges();

    // Inputs must remain visible and accessible in the DOM
    const v4Input = fixture.nativeElement.querySelector('input[formControlName="v4"]');
    expect(v4Input).toBeTruthy();
    expect(v4Input.value).toBe('10.0.0.50');

    // Inputs remain editable
    component.updateStaticIp('subnet-1', '10.0.0.60', 'v4');
    expect(component.staticIpMap.get('subnet-1-v4')).toBe('10.0.0.60');
  });

  it('should render warning badge immediately when initList has order: 0 disabled on load', async () => {
    fixture.componentRef.setInput('initList', [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: false },
      { order: 1, subnetEId: 'subnet-eid-2', enabled: true },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isPrimaryInterfaceDisabled('subnet-1')).toBeTrue();
    const warningBadge = fixture.nativeElement.querySelector('.warning-badge');
    expect(warningBadge).toBeTruthy();
    expect(warningBadge.textContent).toContain('Primary interface disabled');
  });

  it('should re-index order sequentially and maintain enabled states when an interface is removed', async () => {
    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    fixture.componentRef.setInput('initList', [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: true },
      { order: 1, subnetEId: 'subnet-eid-2', enabled: false },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // Remove primary interface (subnet-1 at index 0)
    component.removeItemByIndex(0);
    fixture.detectChanges();

    expect(component.networkList.length).toBe(1);
    expect(component.networkList[0].id).toBe('subnet-2');
    expect(component.isInterfaceEnabled('subnet-2')).toBeFalse();
    // Subnet 2 is now at index 0 and disabled, so warning badge is active
    expect(component.isPrimaryInterfaceDisabled('subnet-2')).toBeTrue();
    expect(emittedNetworks?.[0].order).toBe(0);
    expect(emittedNetworks?.[0].enabled).toBeFalse();
  });

  it('should treat null or undefined enabled in initList as enabled: true', async () => {
    let emittedNetworks: CreateInstanceNetwork[] | undefined;
    component.networksChange.subscribe(networks => (emittedNetworks = networks));

    fixture.componentRef.setInput('initList', [
      { order: 0, subnetEId: 'subnet-eid-1', enabled: null as unknown as boolean },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isInterfaceEnabled('subnet-1')).toBeTrue();
    expect(emittedNetworks?.[0].enabled).toBeTrue();
  });
});
