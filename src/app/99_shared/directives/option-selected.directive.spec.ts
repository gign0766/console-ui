import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatOption } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { OptionSelectedDirective } from './option-selected.directive';

@Component({
  imports: [MatOption, OptionSelectedDirective],
  template: `<mat-option value="a" [spxOptionSelected]="selected()">A</mat-option>`,
})
class HostComponent {
  selected = signal(false);
}

describe('OptionSelectedDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let option: MatOption;
  let element: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    const debug = fixture.debugElement.query(By.directive(MatOption));
    option = debug.injector.get(MatOption);
    element = debug.nativeElement;
    await fixture.whenStable();
  });

  it('should leave the option unselected when the flag is false', () => {
    expect(option.selected).toBeFalse();
    expect(element.getAttribute('aria-selected')).toBe('false');
  });

  it('should select and deselect the option as the flag changes', async () => {
    fixture.componentInstance.selected.set(true);
    await fixture.whenStable();
    expect(option.selected).toBeTrue();
    expect(element.getAttribute('aria-selected')).toBe('true');

    fixture.componentInstance.selected.set(false);
    await fixture.whenStable();
    expect(option.selected).toBeFalse();
    expect(element.getAttribute('aria-selected')).toBe('false');
  });

  it('should restore the selection when something else deselects the option', async () => {
    fixture.componentInstance.selected.set(true);
    await fixture.whenStable();

    option.deselect(false);
    fixture.detectChanges();

    expect(option.selected).toBeTrue();
  });

  it('should not emit a selection change', async () => {
    const changes = jasmine.createSpy('selectionChange');
    option.onSelectionChange.subscribe(changes);

    fixture.componentInstance.selected.set(true);
    await fixture.whenStable();

    expect(changes).not.toHaveBeenCalled();
  });
});
