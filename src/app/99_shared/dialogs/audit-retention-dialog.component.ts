import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BannerComponent } from '@shared/components/banner/banner.component';
import { BannerLevelEnum } from '@shared/models/enums';
import { AuditRetention } from '@shared/services/audit-log.service';

export interface AuditRetentionDialogResult {
  // null restores the platform default
  retentionDays: number | null;
}

@Component({
  selector: 'spx-audit-retention-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    BannerComponent,
  ],
  template: `
    <h2 mat-dialog-title>Audit log retention</h2>
    <div mat-dialog-content class="d-flex flex-column">
      <div class="dialog-form">
        <p class="dialog-form__text">Events older than the retention are permanently removed.</p>

        <mat-form-field class="w-100">
          <mat-label>Retention (days)</mat-label>
          <input
            matInput
            type="number"
            step="1"
            [min]="data.minDays"
            [max]="data.maxDays"
            [formControl]="retentionDays"
            (keydown.enter)="save()" />
          <mat-hint>
            Between {{ data.minDays }} and {{ data.maxDays }} days. Platform default: {{ data.defaultDays }} days
          </mat-hint>
          @if (retentionDays.hasError('required')) {
            <mat-error>Retention is required</mat-error>
          } @else if (retentionDays.invalid) {
            <mat-error>Must be a whole number between {{ data.minDays }} and {{ data.maxDays }}</mat-error>
          }
        </mat-form-field>

        @if (isLower()) {
          <spx-banner class="mt-3" [level]="BannerLevelEnum.Warn" multiline>
            Lowering the retention deletes history: events older than {{ value() }} days will be permanently removed.
          </spx-banner>
        }
      </div>
    </div>
    <div mat-dialog-actions align="end">
      @if (!data.isDefault) {
        <button type="button" mat-button class="dialog-form__reset" (click)="reset()">Reset to default</button>
      }
      <button type="button" mat-button mat-dialog-close>Cancel</button>
      <button type="button" matButton="filled" [disabled]="!canSave()" (click)="save()">Save</button>
    </div>
  `,
  styles: `
    .dialog-form {
      padding-block: 0.75rem;
      min-width: min(400px, 80vw);
      display: flex;
      flex-direction: column;

      &__text {
        margin-top: 0;
        color: var(--mat-sys-on-surface-variant);
      }

      &__reset {
        margin-right: auto;
      }
    }
  `,
})
export class AuditRetentionDialog {
  readonly dialogRef = inject(MatDialogRef<AuditRetentionDialog, AuditRetentionDialogResult>);
  readonly data = inject<AuditRetention>(MAT_DIALOG_DATA);

  protected readonly BannerLevelEnum = BannerLevelEnum;

  retentionDays = new FormControl<number | null>(this.data.retentionDays, {
    validators: [
      Validators.required,
      Validators.min(this.data.minDays),
      Validators.max(this.data.maxDays),
      Validators.pattern(/^\d+$/),
    ],
  });

  // Zoneless: a signal mirrors the form value
  protected value = toSignal(this.retentionDays.valueChanges, { initialValue: this.retentionDays.value });

  protected isValid = computed(() => {
    const v = this.value();
    return v !== null && Number.isInteger(v) && v >= this.data.minDays && v <= this.data.maxDays;
  });
  protected isLower = computed(() => this.isValid() && this.value()! < this.data.retentionDays);
  protected canSave = computed(() => this.isValid() && this.value() !== this.data.retentionDays);

  save() {
    if (this.canSave()) {
      this.dialogRef.close({ retentionDays: this.value() });
    }
  }

  reset() {
    this.dialogRef.close({ retentionDays: null });
  }
}
