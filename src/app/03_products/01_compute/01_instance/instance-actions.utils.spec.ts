import {
  extractNetworksFromInstance,
  buildUpdatePayloadFromInstance,
  parseIp,
  InstanceActions,
} from './instance-actions.utils';
import { ProductInstance } from '@products/00_shared/models/product.model';
import {
  CreateInstanceNetwork,
  CPU_DEFAULT_VALUE,
  MEMORY_DEFAULT_VALUE,
  VM_TYPE_DEFAULT,
} from '@products/00_shared/models/compute/instance/instance';
import { RunStrategy } from '@products/00_shared/models/compute/instance/enums/run-strategy.enum';
import { AdvancedOptionsInput } from '@products/00_shared/models/compute/instance/advanced-options.model';

describe('InstanceActions Utilities', () => {
  describe('parseIp', () => {
    it('should parse single IPv4 address', () => {
      const res = parseIp('192.168.1.50');
      expect(res).toEqual({ v4: '192.168.1.50' });
    });

    it('should parse single IPv6 address', () => {
      const res = parseIp('2001:db8::1');
      expect(res).toEqual({ v6: '2001:db8::1' });
    });

    it('should parse comma-separated dual stack addresses', () => {
      const res = parseIp('192.168.1.50, 2001:db8::1');
      expect(res).toEqual({ v4: '192.168.1.50', v6: '2001:db8::1' });
    });

    it('should return empty object for falsy input', () => {
      expect(parseIp('')).toEqual({});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parseIp(undefined as any)).toEqual({});
    });
  });

  describe('extractNetworksFromInstance', () => {
    const projectId = 'proj-123';

    it('should return empty array when instance is null or has no networks', () => {
      expect(extractNetworksFromInstance(null as unknown as ProductInstance, projectId)).toEqual([]);
      expect(extractNetworksFromInstance({} as ProductInstance, projectId)).toEqual([]);
    });

    it('should extract networks matching interface by name and map state to enabled', () => {
      const instance = {
        id: 'inst-1',
        eid: 'inst-1',
        productName: 'test-vm',
        gitops: '',
        vm: {
          kind: 'VirtualMachine',
          apiVersion: 'kubevirt.io/v1',
          metadata: { name: 'test-vm' },
          status: { created: true, ready: true, printableStatus: 'Running' },
          spec: {
            template: {
              metadata: {
                name: 'test-vm',
                annotations: {
                  [`sub-primary.spx-${projectId}.ovn.kubernetes.io/ip_address`]: '10.0.0.10,fd00::10',
                  [`sub-secondary.spx-${projectId}.ovn.kubernetes.io/ip_address`]: '10.0.1.20',
                },
              },
              spec: {
                architecture: 'amd64',
                hostname: 'test-vm',
                accessCredentials: [],
                volumes: [],
                domain: {
                  resources: {},
                  devices: {
                    disks: [],
                    interfaces: [
                      { name: 'interface-1', model: 'e1000', state: 'down' },
                      { name: 'interface-0', model: 'virtio', state: 'up' },
                    ],
                  },
                },
                networks: [
                  {
                    name: 'interface-0',
                    multus: { networkName: `spx-${projectId}/sub-primary`, default: true },
                  },
                  {
                    name: 'interface-1',
                    multus: { networkName: `spx-${projectId}/sub-secondary`, default: false },
                  },
                ],
              },
            },
          },
        },
      } as unknown as ProductInstance;

      const result = extractNetworksFromInstance(instance, projectId);

      expect(result.length).toBe(2);

      // order: 0 (matched interface-0 by name despite reverse array order in domain.devices.interfaces)
      expect(result[0]).toEqual({
        order: 0,
        subnetEId: 'sub-primary',
        model: 'virtio',
        enabled: true,
        ipv4: '10.0.0.10',
        ipv6: 'fd00::10',
      });

      // order: 1 (matched interface-1 with state: down -> enabled: false)
      expect(result[1]).toEqual({
        order: 1,
        subnetEId: 'sub-secondary',
        model: 'e1000',
        enabled: false,
        ipv4: '10.0.1.20',
      });
    });

    it('should default legacy or missing state to enabled=true', () => {
      const instance = {
        id: 'inst-legacy',
        eid: 'inst-legacy',
        productName: 'legacy-vm',
        gitops: '',
        vm: {
          kind: 'VirtualMachine',
          apiVersion: 'kubevirt.io/v1',
          metadata: { name: 'legacy-vm' },
          status: { created: true, ready: true, printableStatus: 'Running' },
          spec: {
            template: {
              metadata: { name: 'legacy-vm' },
              spec: {
                architecture: 'amd64',
                hostname: 'legacy-vm',
                accessCredentials: [],
                volumes: [],
                domain: {
                  resources: {},
                  devices: {
                    disks: [],
                    interfaces: [
                      { name: 'net-0' }, // state omitted
                    ],
                  },
                },
                networks: [
                  {
                    name: 'net-0',
                    multus: { networkName: `spx-${projectId}/sub-legacy`, default: true },
                  },
                ],
              },
            },
          },
        },
      } as unknown as ProductInstance;

      const result = extractNetworksFromInstance(instance, projectId);
      expect(result.length).toBe(1);
      expect(result[0].enabled).toBeTrue();
    });

    it('should handle multus network name without project prefix or raw subnet eid', () => {
      const instance = {
        id: 'inst-2',
        eid: 'inst-2',
        productName: 'vm-raw-sub',
        gitops: '',
        vm: {
          kind: 'VirtualMachine',
          apiVersion: 'kubevirt.io/v1',
          metadata: { name: 'vm-raw-sub' },
          status: { created: true, ready: true, printableStatus: 'Running' },
          spec: {
            template: {
              metadata: { name: 'vm-raw-sub' },
              spec: {
                architecture: 'amd64',
                hostname: 'vm-raw-sub',
                accessCredentials: [],
                volumes: [],
                domain: {
                  resources: {},
                  devices: {
                    disks: [],
                    interfaces: [],
                  },
                },
                networks: [
                  {
                    name: 'interface-0',
                    multus: { networkName: 'raw-subnet-eid', default: true },
                  },
                ],
              },
            },
          },
        },
      } as unknown as ProductInstance;

      const result = extractNetworksFromInstance(instance, projectId);
      expect(result.length).toBe(1);
      expect(result[0].subnetEId).toBe('raw-subnet-eid');
      expect(result[0].enabled).toBeTrue();
      expect(result[0].model).toBe('auto');
    });

    it('should extract macAddress from domain interface, annotation, and vmi status', () => {
      const instance = {
        id: 'inst-mac',
        eid: 'inst-mac',
        productName: 'vm-mac',
        gitops: '',
        vm: {
          kind: 'VirtualMachine',
          apiVersion: 'kubevirt.io/v1',
          metadata: { name: 'vm-mac' },
          status: { created: true, ready: true, printableStatus: 'Running' },
          spec: {
            template: {
              metadata: {
                name: 'vm-mac',
                annotations: {
                  // Net 1 has MAC in annotation
                  [`sub-annot.spx-${projectId}.ovn.kubernetes.io/mac_address`]: '52:54:00:22:33:44',
                },
              },
              spec: {
                architecture: 'amd64',
                hostname: 'vm-mac',
                accessCredentials: [],
                volumes: [],
                domain: {
                  resources: {},
                  devices: {
                    disks: [],
                    interfaces: [
                      // Net 0 has explicit macAddress on domain interface
                      { name: 'interface-0', model: 'virtio', macAddress: '52:54:00:11:22:33' },
                      // Net 1 has no macAddress on domain interface
                      { name: 'interface-1', model: 'virtio' },
                      // Net 2 has no macAddress on domain interface
                      { name: 'interface-2', model: 'virtio' },
                    ],
                  },
                },
                networks: [
                  { name: 'interface-0', multus: { networkName: `spx-${projectId}/sub-domain` } },
                  { name: 'interface-1', multus: { networkName: `spx-${projectId}/sub-annot` } },
                  { name: 'interface-2', multus: { networkName: `spx-${projectId}/sub-status` } },
                ],
              },
            },
          },
        },
        vmi: {
          status: {
            interfaces: [
              // Net 2 has MAC in status
              { name: 'interface-2', mac: '52:54:00:55:66:77' },
            ],
          },
        },
      } as unknown as ProductInstance;

      const result = extractNetworksFromInstance(instance, projectId);
      expect(result.length).toBe(3);

      expect(result[0].macAddress).toBe('52:54:00:11:22:33');
      expect(result[1].macAddress).toBe('52:54:00:22:33:44');
      expect(result[2].macAddress).toBe('52:54:00:55:66:77');
    });
  });

  describe('buildUpdatePayloadFromInstance', () => {
    const updatedNetworks: CreateInstanceNetwork[] = [
      { order: 0, subnetEId: 'sub-1', model: 'virtio', enabled: true, macAddress: '52:54:00:11:22:33' },
      { order: 1, subnetEId: 'sub-2', model: 'virtio', enabled: false },
    ];

    it('should build complete UpdateInstance preserving existing configuration', () => {
      const instance = {
        id: 'inst-1',
        eid: 'eid-inst-1',
        productName: 'My Server',
        gitops: '',
        cloudInit: '#custom-cloud-init',
        containerDisks: ['registry.spx/image:v1'],
        vm: {
          kind: 'VirtualMachine',
          apiVersion: 'kubevirt.io/v1',
          metadata: {
            name: 'my-server',
            labels: {
              'user.superphenix.net/env': 'production',
              'internal.system/ignore': 'skip',
            },
          },
          status: { created: true, ready: true, printableStatus: 'Running' },
          spec: {
            runStrategy: RunStrategy.RerunOnFailure,
            preference: { name: 'spx.standard' },
            template: {
              metadata: { name: 'my-server' },
              spec: {
                architecture: 'amd64',
                hostname: 'my-server',
                accessCredentials: [
                  {
                    sshPublicKey: {
                      source: { secret: { secretName: 'ssh-key-1' } },
                    },
                  },
                ],
                volumes: [
                  {
                    name: 'disk-root',
                    persistentVolumeClaim: { claimName: 'pvc-root-volume' },
                  },
                ],
                domain: {
                  resources: {},
                  cpu: { cores: 4, sockets: 1, threads: 1 },
                  memory: { guest: '16', guestCurrent: '16' },
                  devices: {
                    interfaces: [],
                    disks: [
                      {
                        name: 'disk-root',
                        disk: { bus: 'virtio' },
                      },
                      {
                        name: 'cloud-init',
                        disk: { bus: 'sata' },
                      },
                    ],
                  },
                },
                networks: [],
              },
            },
          },
        },
      } as unknown as ProductInstance;

      const payload = buildUpdatePayloadFromInstance(instance, updatedNetworks);

      expect(payload.general.productName).toBe('My Server');
      expect(payload.general.runStrategy).toBe(RunStrategy.RerunOnFailure);
      expect(payload.general.vmType).toBe('spx.standard');
      expect(payload.general.labels).toEqual(['user.superphenix.net/env:production']);

      expect(payload.compute.cpu).toBe(4);
      expect(payload.compute.memory).toBe(16);

      expect(payload.network).toEqual(updatedNetworks);

      // Disks should exclude cloud-init and use extractVolumeEID
      expect(payload.disks).toEqual([
        {
          order: 0,
          cdrom: false,
          bus: 'virtio',
          eid: 'pvc-root-volume',
        },
      ]);

      expect(payload.cloudInit).toEqual({
        config: '#custom-cloud-init',
        bus: 'sata',
        custom: true,
      });

      expect(payload.sshKeys).toEqual(['ssh-key-1']);
      expect(payload.containerDisks).toEqual(['registry.spx/image:v1']);
    });

    it('should handle default and missing values gracefully', () => {
      const instance: ProductInstance = {
        id: 'inst-minimal',
        eid: 'eid-minimal',
        productName: 'minimal',
        gitops: '',
      };

      const payload = buildUpdatePayloadFromInstance(instance, []);

      expect(payload.general.productName).toBe('minimal');
      expect(payload.general.runStrategy).toBe(RunStrategy.Manual);
      expect(payload.general.vmType).toBe(VM_TYPE_DEFAULT);
      expect(payload.compute.cpu).toBe(CPU_DEFAULT_VALUE);
      expect(payload.compute.memory).toBe(MEMORY_DEFAULT_VALUE);
      expect(payload.network).toEqual([]);
      expect(payload.disks).toBeUndefined();
      expect(payload.cloudInit).toBeUndefined();
      expect(payload.sshKeys).toBeUndefined();
      expect(payload.containerDisks).toBeUndefined();
    });

    it('should preserve advanced options when provided', () => {
      const instance: ProductInstance = {
        id: 'inst-adv',
        eid: 'eid-adv',
        productName: 'adv-vm',
        gitops: '',
      };

      const advanced: AdvancedOptionsInput = {
        firmware: {
          bootloader: {
            efi: { secureBoot: true },
          },
        },
      };

      const payload = buildUpdatePayloadFromInstance(instance, updatedNetworks, advanced);
      expect(payload.advanced).toEqual(advanced);
    });
  });

  describe('InstanceActions class bindings', () => {
    it('should expose utility functions as static methods on InstanceActions', () => {
      expect(InstanceActions.extractNetworksFromInstance).toBe(extractNetworksFromInstance);
      expect(InstanceActions.buildUpdatePayloadFromInstance).toBe(buildUpdatePayloadFromInstance);
      expect(InstanceActions.parseIp).toBe(parseIp);
    });
  });
});
