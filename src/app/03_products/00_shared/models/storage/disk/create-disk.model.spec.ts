import {
  CreateDisk,
  DISK_SOURCE_TYPE_NAMES,
  DISK_SOURCE_TYPE_OPTIONS,
  DiskSourceTypeBlank,
  DiskSourceTypeClone,
  DiskSourceTypeHttp,
  DiskSourceTypeRegistry,
  DiskSourceTypeSnapshot,
  DiskSourceTypes,
  getDiskSourceTypeName,
} from './create-disk.model';

describe('CreateDisk model and helpers', () => {
  describe('DiskSourceTypes and constants', () => {
    it('should define DiskSourceType constants correctly', () => {
      expect(DiskSourceTypeBlank).toBe('blank');
      expect(DiskSourceTypeHttp).toBe('http');
      expect(DiskSourceTypeSnapshot).toBe('snapshot');
      expect(DiskSourceTypeClone).toBe('clone');
      expect(DiskSourceTypeRegistry).toBe('registry');
    });

    it('should include all disk source types in DiskSourceTypes array', () => {
      expect(DiskSourceTypes).toEqual([
        DiskSourceTypeBlank,
        DiskSourceTypeHttp,
        DiskSourceTypeSnapshot,
        DiskSourceTypeClone,
        DiskSourceTypeRegistry,
      ]);
    });

    it('should map DiskSourceTypeHttp to HTTP in DISK_SOURCE_TYPE_NAMES', () => {
      expect(DISK_SOURCE_TYPE_NAMES[DiskSourceTypeHttp]).toBe('HTTP');
      expect(DISK_SOURCE_TYPE_NAMES[DiskSourceTypeBlank]).toBe('Blank');
      expect(DISK_SOURCE_TYPE_NAMES[DiskSourceTypeSnapshot]).toBe('Snapshot');
      expect(DISK_SOURCE_TYPE_NAMES[DiskSourceTypeClone]).toBe('Clone');
      expect(DISK_SOURCE_TYPE_NAMES[DiskSourceTypeRegistry]).toBe('Registry');
    });

    it('should provide DISK_SOURCE_TYPE_OPTIONS containing all types with their names', () => {
      expect(DISK_SOURCE_TYPE_OPTIONS.length).toBe(5);
      const httpOption = DISK_SOURCE_TYPE_OPTIONS.find(opt => opt.value === DiskSourceTypeHttp);
      expect(httpOption).toEqual({ value: 'http', name: 'HTTP' });
    });
  });

  describe('getDiskSourceTypeName', () => {
    it('should return HTTP for http source type', () => {
      expect(getDiskSourceTypeName(DiskSourceTypeHttp)).toBe('HTTP');
      expect(getDiskSourceTypeName('http')).toBe('HTTP');
    });

    it('should return the correct display name for other known source types', () => {
      expect(getDiskSourceTypeName(DiskSourceTypeBlank)).toBe('Blank');
      expect(getDiskSourceTypeName(DiskSourceTypeSnapshot)).toBe('Snapshot');
      expect(getDiskSourceTypeName(DiskSourceTypeClone)).toBe('Clone');
      expect(getDiskSourceTypeName(DiskSourceTypeRegistry)).toBe('Registry');
    });

    it('should return original string for unknown source types', () => {
      expect(getDiskSourceTypeName('custom')).toBe('custom');
      expect(getDiskSourceTypeName('unknown')).toBe('unknown');
    });

    it('should return empty string for null, undefined, or empty string', () => {
      expect(getDiskSourceTypeName(undefined)).toBe('');
      expect(getDiskSourceTypeName(null)).toBe('');
      expect(getDiskSourceTypeName('')).toBe('');
    });
  });

  describe('CreateDisk constructor', () => {
    it('should coerce storage to string and delete az field from general', () => {
      const disk = new CreateDisk({
        general: {
          productName: 'test-disk',
          storage: 20 as unknown as string,
          storageClass: 'standard',
          source: { type: DiskSourceTypeHttp, url: 'http://example.com/image.img' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...({ az: 'fr-par-1' } as any),
        },
      });

      expect(disk.general.storage).toBe('20');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((disk.general as any).az).toBeUndefined();
      expect(disk.general.productName).toBe('test-disk');
    });
  });
});
