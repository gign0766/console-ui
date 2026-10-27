import { Directive, DoCheck, inject, input } from '@angular/core';
import { MatOption } from '@angular/material/core';

/**
 * Renders a mat-option as selected (checkmark, aria-selected) from the bound flag.
 * mat-autocomplete never selects options itself, unlike mat-select, and deselects them
 * while the user types, so the flag is re-applied on every check.
 */
@Directive({
  selector: 'mat-option[spxOptionSelected]',
})
export class OptionSelectedDirective implements DoCheck {
  private option = inject(MatOption);

  spxOptionSelected = input.required<boolean>();

  ngDoCheck(): void {
    const selected = this.spxOptionSelected();
    if (this.option.selected === selected) {
      return;
    }
    if (selected) {
      this.option.select(false);
    } else {
      this.option.deselect(false);
    }
  }
}
