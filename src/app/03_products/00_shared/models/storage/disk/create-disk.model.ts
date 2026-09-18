export const DiskSourceTypeRegistry = 'registry';
export const DiskSourceTypeHttp = 'http';
export const DiskSourceTypeSnapshot = 'snapshot';
export const DiskSourceTypeClone = 'clone';
export const DiskSourceTypeBlank = 'blank';

export const DiskSourceTypes = [
  DiskSourceTypeBlank,
  DiskSourceTypeHttp,
  DiskSourceTypeSnapshot,
  DiskSourceTypeClone,
  DiskSourceTypeRegistry,
] as const;

export type DiskSourceType = (typeof DiskSourceTypes)[number];

export interface DiskSourceTypeOption {
  value: DiskSourceType;
  name: string;
}

export const DISK_SOURCE_TYPE_NAMES: Record<DiskSourceType, string> = {
  [DiskSourceTypeBlank]: 'Blank',
  [DiskSourceTypeHttp]: 'HTTP',
  [DiskSourceTypeSnapshot]: 'Snapshot',
  [DiskSourceTypeClone]: 'Clone',
  [DiskSourceTypeRegistry]: 'Registry',
};

export const DISK_SOURCE_TYPE_OPTIONS: readonly DiskSourceTypeOption[] = DiskSourceTypes.map(type => ({
  value: type,
  name: DISK_SOURCE_TYPE_NAMES[type],
}));

export function getDiskSourceTypeName(type?: string | null): string {
  if (!type) {
    return '';
  }
  return DISK_SOURCE_TYPE_NAMES[type as DiskSourceType] ?? type;
}

export class CreateDisk {
  constructor(init: Partial<CreateDisk>) {
    Object.assign(this, init);
    // Used to remove the field present in form as cast in Typescript won't remove non existing field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (this as any).general['az'];

    this.general.storage = this.general.storage + ''; // force string value;
  }

  general!: {
    productName: string;
    labels?: string[];
    storage: string;
    source: DiskSource;
    storageClass: string;
  };
}

export interface DiskSource {
  type: DiskSourceType;
  url?: string;
  clone?: string;
  snapshot?: string;
}

export class UpdateDisk {
  general!: {
    productName: string;
    labels?: string[];
    storage: string;
  };
}
