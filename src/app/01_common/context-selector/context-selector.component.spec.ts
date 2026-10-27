import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader, TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { MatAutocompleteHarness } from '@angular/material/autocomplete/testing';
import { By } from '@angular/platform-browser';
import { Organization, Project } from '@shared/models/data/organization';
import { User } from '@shared/models/data/user';
import { AuthService } from '@shared/services/auth.service';
import { OrganizationService } from '@shared/services/organization.service';
import { StateService } from '@shared/services/state.service';

import { ContextSelectorComponent } from './context-selector.component';

const projects: Project[] = [
  { id: 'p1', name: 'api' },
  { id: 'p2', name: 'web' },
];
const personal = { id: 'org-p', name: 'Personal', ownerId: 'u1', projects } as Organization;
const guestB = { id: 'org-b', name: 'beta', ownerId: 'u2', projects: [] as Project[] } as Organization;
const guestA = { id: 'org-a', name: 'Alpha', ownerId: 'u2', projects: [] as Project[] } as Organization;
const user = { id: 'u1', personalOrg: [personal], guestOrg: [guestB, guestA] } as unknown as User;

describe('ContextSelectorComponent', () => {
  let component: ContextSelectorComponent;
  let fixture: ComponentFixture<ContextSelectorComponent>;
  let loader: HarnessLoader;
  let stateSvc: {
    organization: ReturnType<typeof signal<Organization | undefined>>;
    project: ReturnType<typeof signal<Project | undefined>>;
    setOrganization: jasmine.Spy;
    setProject: jasmine.Spy;
  };
  let orgInput: MatAutocompleteHarness;
  let projectInput: MatAutocompleteHarness;

  const orgAutocomplete = () =>
    fixture.debugElement.queryAll(By.directive(MatAutocomplete))[0].componentInstance as MatAutocomplete;

  const search = async (harness: MatAutocompleteHarness, text: string) => {
    await harness.clear();
    await harness.enterText(text);
  };

  beforeEach(async () => {
    stateSvc = {
      organization: signal<Organization | undefined>(personal),
      project: signal<Project | undefined>(projects[0]),
      setOrganization: jasmine.createSpy('setOrganization').and.resolveTo(true),
      setProject: jasmine.createSpy('setProject'),
    };

    await TestBed.configureTestingModule({
      imports: [ContextSelectorComponent],
      providers: [
        { provide: AuthService, useValue: { user: signal(user) } },
        { provide: StateService, useValue: stateSvc },
        { provide: OrganizationService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContextSelectorComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    orgInput = await loader.getHarness(MatAutocompleteHarness.with({ selector: '#orgSelect' }));
    projectInput = await loader.getHarness(MatAutocompleteHarness.with({ selector: '#projectSelect' }));
  });

  it('should list personal organizations first, then guest ones by name', () => {
    expect(component.orgList().map(o => o.id)).toEqual(['org-p', 'org-a', 'org-b']);
  });

  it('should show the current organization and project', async () => {
    expect(await orgInput.getValue()).toBe('Personal');
    expect(await projectInput.getValue()).toBe('api');
  });

  it('should follow state changes', async () => {
    stateSvc.organization.set(guestA);
    stateSvc.project.set(undefined);

    expect(await orgInput.getValue()).toBe('Alpha');
    expect(await projectInput.getValue()).toBe('');
  });

  it('should mark the current option as selected, also while searching', async () => {
    await orgInput.focus();
    let selected = await orgInput.getOptions({ isSelected: true });
    expect(selected.length).toBe(1);
    expect(await selected[0].getText()).toContain('Personal');

    await search(orgInput, 'al');
    expect((await orgInput.getOptions()).length).toBe(2);
    selected = await orgInput.getOptions({ isSelected: true });
    expect(selected.length).toBe(1);
    expect(await selected[0].getText()).toContain('Personal');
  });

  it('should filter organizations by name, case-insensitively', async () => {
    await orgInput.focus();
    await search(orgInput, 'BET');

    const options = await orgInput.getOptions();
    expect(options.length).toBe(1);
    expect(await options[0].getText()).toContain('beta');
  });

  it('should not match organizations on their ID', async () => {
    await orgInput.focus();
    await search(orgInput, 'org-a');

    const options = await orgInput.getOptions();
    expect(options.length).toBe(1);
    expect(await options[0].getText()).toBe('No organization found');
  });

  it('should keep the selected option in sync when the state changes', async () => {
    stateSvc.organization.set(guestB);
    await orgInput.focus();

    const selected = await orgInput.getOptions({ isSelected: true });
    expect(selected.length).toBe(1);
    expect(await selected[0].getText()).toContain('beta');
  });

  it('should show an empty state when nothing matches', async () => {
    await orgInput.focus();
    await search(orgInput, 'nothing');

    const options = await orgInput.getOptions();
    expect(options.length).toBe(1);
    expect(await options[0].getText()).toBe('No organization found');
    expect(await options[0].isDisabled()).toBeTrue();
  });

  it('should activate the first match only while searching', async () => {
    await orgInput.focus();
    expect(orgAutocomplete().autoActiveFirstOption).toBeFalse();

    await search(orgInput, 'a');
    expect(orgAutocomplete().autoActiveFirstOption).toBeTrue();
  });

  it('should switch organization when an option is picked', async () => {
    await orgInput.focus();
    await search(orgInput, 'beta');
    await orgInput.selectOption({ text: /beta/ });

    expect(stateSvc.setOrganization).toHaveBeenCalledWith('org-b');
  });

  it('should put the current organization back when the switch fails', async () => {
    stateSvc.setOrganization.and.resolveTo(false);

    await orgInput.focus();
    await search(orgInput, 'beta');
    await orgInput.selectOption({ text: /beta/ });
    await fixture.whenStable();

    expect(stateSvc.setOrganization).toHaveBeenCalledWith('org-b');
    expect(await orgInput.getValue()).toBe('Personal');
  });

  it('should keep the picked organization when the switch succeeds', async () => {
    stateSvc.setOrganization.and.callFake(async () => {
      stateSvc.organization.set(guestB);
      return true;
    });

    await orgInput.focus();
    await search(orgInput, 'beta');
    await orgInput.selectOption({ text: /beta/ });
    await fixture.whenStable();

    expect(await orgInput.getValue()).toBe('beta');
  });

  it('should restore the current organization when closing without a pick', async () => {
    await orgInput.focus();
    await search(orgInput, 'zz');
    await (await orgInput.host()).sendKeys(TestKey.ESCAPE);

    expect(await orgInput.isOpen()).toBeFalse();
    expect(await orgInput.getValue()).toBe('Personal');
    expect(stateSvc.setOrganization).not.toHaveBeenCalled();
  });

  it('should select the current name when the focused field is clicked again', async () => {
    await orgInput.focus();
    await search(orgInput, 'zz');
    const host = await orgInput.host();
    await host.sendKeys(TestKey.ESCAPE);
    await host.click();

    const input = fixture.nativeElement.querySelector('#orgSelect') as HTMLInputElement;
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 'Personal'.length]);
  });

  it('should keep a search being typed when the field is clicked', async () => {
    await orgInput.focus();
    await search(orgInput, 'alp');
    const input = fixture.nativeElement.querySelector('#orgSelect') as HTMLInputElement;
    input.setSelectionRange(3, 3);
    await (await orgInput.host()).click();

    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 3]);
  });

  it('should scroll the selected option into view when opening', async () => {
    const scroll = spyOn(Element.prototype, 'scrollIntoView');

    await orgInput.focus();

    expect(scroll).toHaveBeenCalled();
    expect((scroll.calls.mostRecent().object as Element).textContent).toContain('Personal');
  });

  it('should filter projects and switch project', async () => {
    await projectInput.focus();
    await search(projectInput, 'WE');

    const options = await projectInput.getOptions();
    expect(options.length).toBe(1);

    await projectInput.selectOption({ text: 'web' });
    expect(stateSvc.setProject).toHaveBeenCalledWith('p2');
  });
});
