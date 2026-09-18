import {
  BUS_AUTO,
  BUS_LIST,
  BUS_SATA,
  BUS_VIRTIO,
  getBusName,
} from './instance';

describe('Instance BUS constants and helpers', () => {
  describe('BUS constants', () => {
    it('should define BUS_AUTO with correct value and display name', () => {
      expect(BUS_AUTO).toEqual({ value: 'auto', name: 'Auto' });
    });

    it('should define BUS_SATA with correct value and display name', () => {
      expect(BUS_SATA).toEqual({ value: 'sata', name: 'SATA' });
    });

    it('should define BUS_VIRTIO with correct value and display name', () => {
      expect(BUS_VIRTIO).toEqual({ value: 'virtio', name: 'VirtIO' });
    });

    it('should contain all bus constants in BUS_LIST', () => {
      expect(BUS_LIST).toEqual([BUS_AUTO, BUS_SATA, BUS_VIRTIO]);
      expect(BUS_LIST.length).toBe(3);
    });
  });

  describe('getBusName', () => {
    it('should return the display name for known bus values', () => {
      expect(getBusName('auto')).toBe('Auto');
      expect(getBusName('sata')).toBe('SATA');
      expect(getBusName('virtio')).toBe('VirtIO');
    });

    it('should return the original value when unknown bus value is provided', () => {
      expect(getBusName('scsi')).toBe('scsi');
      expect(getBusName('ide')).toBe('ide');
    });

    it('should handle undefined, null, or empty string gracefully', () => {
      expect(getBusName(undefined)).toBe('');
      expect(getBusName(null)).toBe('');
      expect(getBusName('')).toBe('');
    });
  });
});
