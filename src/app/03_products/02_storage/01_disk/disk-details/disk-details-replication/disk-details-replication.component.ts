import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiskReplication } from '@products/00_shared/models/storage/disk/replication.model';
import { formatBytes } from '@products/00_shared/utils/quantity';
import { formatRelativeTime } from '@products/00_shared/utils/time';

@Component({
  selector: 'spx-disk-details-replication',
  imports: [MatChipsModule, MatIconModule, MatTooltipModule, DatePipe],
  templateUrl: './disk-details-replication.component.html',
  styleUrl: './disk-details-replication.component.scss',
})
export class DiskDetailsReplicationComponent {
  replication = input.required<DiskReplication>();

  protected readonly formatBytes = formatBytes;
  protected readonly formatRelativeTime = formatRelativeTime;

  // The cluster message often just restates the state ("volume is marked primary"),
  // which the state chip already shows — only surface messages carrying extra info.
  message = computed(() => {
    const { message, state } = this.replication();
    if (!message) {
      return undefined;
    }
    if (state && message.toLowerCase().includes(state.toLowerCase())) {
      return undefined;
    }
    return message;
  });
}
