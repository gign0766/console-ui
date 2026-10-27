import { Component, computed, inject, input, signal, WritableSignal } from '@angular/core';
import { MatAutocomplete, MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { OptionSelectedDirective } from '@shared/directives/option-selected.directive';
import { getUserOrganization } from '@shared/models/data/user';
import { AuthService } from '@shared/services/auth.service';
import { OrganizationService } from '@shared/services/organization.service';
import { StateService } from '@shared/services/state.service';

const filterByName = <T extends { name: string }>(items: T[], search: string | null) => {
  const text = search?.trim().toLowerCase();
  return text ? items.filter(item => item.name.toLowerCase().includes(text)) : items;
};

@Component({
  selector: 'spx-context-selector',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    OptionSelectedDirective,
  ],
  templateUrl: './context-selector.component.html',
  styleUrl: './context-selector.component.scss',
})
export class ContextSelectorComponent {
  protected auth = inject(AuthService);
  protected stateSvc = inject(StateService);
  protected orgSvc = inject(OrganizationService);

  background = input<'normal' | 'inverted'>('normal');

  /** Text typed in each field; null while the field shows the current item. */
  protected orgSearch = signal<string | null>(null);
  protected projectSearch = signal<string | null>(null);

  orgList = computed(() => {
    const user = this.auth.user();
    return filterByName(user ? getUserOrganization(user) : [], this.orgSearch());
  });

  projectList = computed(() => filterByName(this.stateSvc.organization()?.projects ?? [], this.projectSearch()));

  displayName = (item: { name: string }) => item.name;

  /** Selects the shown name so typing replaces it, like reopening a select; a search being typed is left alone. */
  selectCurrent(input: HTMLInputElement, search: string | null) {
    if (search === null) {
      input.select();
    }
  }

  /** Puts back the current name when the panel closes on a search without a pick (Escape, Tab, click outside). */
  restore(input: HTMLInputElement, search: WritableSignal<string | null>, currentName = '') {
    if (search() !== null) {
      search.set(null);
      input.value = currentName;
    }
  }

  scrollToSelected(autocomplete: MatAutocomplete) {
    const selected = autocomplete.options.find(option => option.selected);
    if (selected) {
      document.getElementById(selected.id)?.scrollIntoView({ block: 'nearest' });
    }
  }

  /** The autocomplete already wrote the picked name in the input: put the current one back if the switch fails. */
  async orgChanged(orgId: string, input: HTMLInputElement) {
    this.orgSearch.set(null);
    if (!(await this.stateSvc.setOrganization(orgId))) {
      input.value = this.stateSvc.organization()?.name ?? '';
    }
  }

  projectChanged(projectId: string) {
    this.projectSearch.set(null);
    this.stateSvc.setProject(projectId);
  }
}
