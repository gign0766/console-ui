export interface DiskReplicationClass {
  name: string;
  schedulingInterval?: string;
  schedulingStartTime?: string;
  mirroringMode?: string;
}

export interface DiskReplication {
  name: string;
  state?: string;
  message?: string;
  lastSyncTime?: string;
  lastSyncDuration?: string;
  lastSyncBytes?: number;
  lastCompletionTime?: string;
  class?: DiskReplicationClass;
}
