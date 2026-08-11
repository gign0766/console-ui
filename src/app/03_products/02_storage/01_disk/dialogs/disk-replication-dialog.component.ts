import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiskReplication } from '@products/00_shared/models/storage/disk/replication.model';
import { formatBytes } from '@products/00_shared/utils/quantity';
import { formatRelativeTime } from '@products/00_shared/utils/time';

@Component({
  selector: 'spx-disk-replication-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    DatePipe,
  ],
  template: `
    <h2 mat-dialog-title>Disk replication</h2>

    <div mat-dialog-content class="replication-dialog">
      @if (data.state || data.lastSyncTime) {
        <div class="replication-dialog__status d-flex align-items-center gap-3">
          @if (data.state; as replicationState) {
            <mat-chip-set aria-label="replication state">
              <mat-chip
                [class]="'status-chip--' + (replicationState === 'Primary' ? 'ready' : 'pending')"
                disabled="true">
                {{ replicationState }}
              </mat-chip>
            </mat-chip-set>
          }
          @if (data.lastSyncTime; as lastSyncTime) {
            <span [matTooltip]="(lastSyncTime | date: 'medium') ?? ''">
              Last synced {{ formatRelativeTime(lastSyncTime) }}
            </span>
          }
        </div>
      }

      <h4 class="label d-flex align-items-center gap-2">
        <div class="mat-icon--with-bg"><mat-icon>sync</mat-icon></div>
        Synchronization
      </h4>
      <div class="replication-dialog__grid">
        <div class="replication-dialog__item">
          <div class="replication-dialog__item-label">Last sync</div>
          <div class="replication-dialog__item-value" [matTooltip]="(data.lastSyncTime | date: 'medium') ?? ''">
            {{ data.lastSyncTime ? formatRelativeTime(data.lastSyncTime) : '-' }}
          </div>
        </div>
        <div class="replication-dialog__item">
          <div class="replication-dialog__item-label">Duration</div>
          <div class="replication-dialog__item-value">{{ data.lastSyncDuration || '-' }}</div>
        </div>
        <div class="replication-dialog__item">
          <div class="replication-dialog__item-label">Size</div>
          <div class="replication-dialog__item-value">
            {{ data.lastSyncBytes ? formatBytes(data.lastSyncBytes) : '-' }}
          </div>
        </div>
        <div class="replication-dialog__item">
          <div class="replication-dialog__item-label">Last completion</div>
          <div class="replication-dialog__item-value">{{ (data.lastCompletionTime | date: 'medium') || '-' }}</div>
        </div>
      </div>

      @if (data.class; as replicationClass) {
        <div class="replication-dialog__hr"></div>

        <h4 class="label d-flex align-items-center gap-2">
          <div class="mat-icon--with-bg"><mat-icon>tune</mat-icon></div>
          Policy
        </h4>
        <div class="replication-dialog__grid">
          <div class="replication-dialog__item">
            <div class="replication-dialog__item-label">Class</div>
            <div class="replication-dialog__item-value">{{ replicationClass.name }}</div>
          </div>
          <div class="replication-dialog__item">
            <div class="replication-dialog__item-label">Mirroring mode</div>
            <div class="replication-dialog__item-value">{{ replicationClass.mirroringMode || '-' }}</div>
          </div>
          <div class="replication-dialog__item">
            <div class="replication-dialog__item-label">Scheduling interval</div>
            <div class="replication-dialog__item-value">{{ replicationClass.schedulingInterval || '-' }}</div>
          </div>
          <div class="replication-dialog__item">
            <div class="replication-dialog__item-label">Scheduling start time</div>
            <div class="replication-dialog__item-value">{{ replicationClass.schedulingStartTime || '-' }}</div>
          </div>
        </div>
      }

      @if (message; as informativeMessage) {
        <div class="replication-dialog__hr"></div>
        <div class="replication-dialog__message d-flex align-items-center gap-2">
          <mat-icon>info</mat-icon>
          <span>{{ informativeMessage }}</span>
        </div>
      }
    </div>

    <mat-dialog-actions align="end">
      <button matButton="outlined" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: `
    .replication-dialog {
      padding-block: 0.75rem 1rem;
      min-width: min(520px, 80vw);
      color: var(--mat-sys-on-surface);

      &__status {
        background-color: var(--background);
        border-radius: var(--br-medium);
        padding: 0.75rem 1rem;
        margin-bottom: 1.25rem;
        font: var(--mat-sys-body-medium);
      }

      h4.label {
        margin-block: 0 0.75rem;
      }

      &__grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem 1.5rem;
      }

      &__item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      &__item-label {
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
      }

      &__item-value {
        font: var(--mat-sys-body-large);
        overflow-wrap: anywhere;
      }

      &__hr {
        border-top: 1px solid var(--stroke-default);
        margin-block: 1rem;
      }

      &__message {
        color: var(--mat-sys-tertiary);
        font: var(--mat-sys-body-medium);

        mat-icon {
          flex-shrink: 0;
        }
      }
    }
  `,
})
export class DiskReplicationDialog {
  readonly data = inject<DiskReplication>(MAT_DIALOG_DATA);

  protected readonly formatBytes = formatBytes;
  protected readonly formatRelativeTime = formatRelativeTime;

  // The cluster message often just restates the state ("volume is marked primary"),
  // which the state chip already shows — only surface messages carrying extra info.
  get message(): string | undefined {
    if (!this.data.message) {
      return undefined;
    }
    if (this.data.state && this.data.message.toLowerCase().includes(this.data.state.toLowerCase())) {
      return undefined;
    }
    return this.data.message;
  }
}
