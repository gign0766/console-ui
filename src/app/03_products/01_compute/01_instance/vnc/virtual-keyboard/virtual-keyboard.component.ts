import { Component, computed, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { DEFAULT_GUEST_LAYOUT, GUEST_LAYOUTS, KeyDef, buildRows } from '../keyboard-layouts';

@Component({
  selector: 'spx-virtual-keyboard',
  imports: [MatButtonModule, MatIcon, MatMenuModule],
  templateUrl: './virtual-keyboard.component.html',
  styleUrl: './virtual-keyboard.component.scss',
})
export class VirtualKeyboardComponent {
  // Keyboard layout configured in the guest OS: labels show what each key position types there.
  layout = model(DEFAULT_GUEST_LAYOUT);

  // Asks the host to type the clipboard text into the VM with the selected layout.
  pasteRequest = output<void>();

  readonly layouts = GUEST_LAYOUTS;
  layoutLabel = computed(() => GUEST_LAYOUTS.find(l => l.id === this.layout())?.label ?? '');

  keyPress = output<{
    keysym: number;
    code?: string;
    needsShift: boolean;
    needsCtrl: boolean;
    needsAlt: boolean;
    needsAltGr?: boolean;
  }>();

  shiftActive = signal(false);
  capsLock = signal(false);
  ctrlActive = signal(false);
  altActive = signal(false);
  altGrActive = signal(false);

  private static readonly XK_CTRL_L = 0xffe3;
  private static readonly XK_ALT_L = 0xffe9;
  private static readonly XK_ALT_R = 0xffea;

  readonly functionRow: KeyDef[] = [
    { label: 'Esc', keysym: 0xff1b, code: 'Escape', width: 1.5 },
    { label: 'F1', keysym: 0xffbe, code: 'F1' },
    { label: 'F2', keysym: 0xffbf, code: 'F2' },
    { label: 'F3', keysym: 0xffc0, code: 'F3' },
    { label: 'F4', keysym: 0xffc1, code: 'F4' },
    { label: 'F5', keysym: 0xffc2, code: 'F5' },
    { label: 'F6', keysym: 0xffc3, code: 'F6' },
    { label: 'F7', keysym: 0xffc4, code: 'F7' },
    { label: 'F8', keysym: 0xffc5, code: 'F8' },
    { label: 'F9', keysym: 0xffc6, code: 'F9' },
    { label: 'F10', keysym: 0xffc7, code: 'F10' },
    { label: 'F11', keysym: 0xffc8, code: 'F11' },
    { label: 'F12', keysym: 0xffc9, code: 'F12' },
  ];

  readonly rows = computed(() => buildRows(this.layout()));

  readonly navKeys: KeyDef[] = [
    { label: 'Ins', keysym: 0xff63, code: 'Insert' },
    { label: 'PgUp', keysym: 0xff55, code: 'PageUp' },
    { label: 'Del', keysym: 0xffff, code: 'Delete' },
    { label: 'PgDn', keysym: 0xff56, code: 'PageDown' },
  ];

  readonly arrowKeys = {
    up: { label: '↑', keysym: 0xff52, code: 'ArrowUp' } as KeyDef,
    left: { label: '←', keysym: 0xff51, code: 'ArrowLeft' } as KeyDef,
    down: { label: '↓', keysym: 0xff54, code: 'ArrowDown' } as KeyDef,
    right: { label: '→', keysym: 0xff53, code: 'ArrowRight' } as KeyDef,
  };

  isShifted(): boolean {
    return this.shiftActive() !== this.capsLock(); // XOR
  }

  // The right Alt key is a sticky AltGr. The layout data has no AltGr level, so labels do not
  // change while it is active.
  private isAltGrKey(key: KeyDef): boolean {
    return key.keysym === VirtualKeyboardComponent.XK_ALT_R;
  }

  getKeyLabel(key: KeyDef): string {
    return (this.isShifted() && key.shiftLabel) || key.label;
  }

  onKeyClick(key: KeyDef) {
    // Handle modifier keys
    if (key.keysym === 0xffe1) {
      this.shiftActive.update(v => !v);
      return;
    }
    if (key.keysym === 0xffe5) {
      this.capsLock.update(v => !v);
      return;
    }
    if (key.keysym === VirtualKeyboardComponent.XK_CTRL_L) {
      this.ctrlActive.update(v => !v);
      return;
    }
    if (this.isAltGrKey(key)) {
      this.altGrActive.update(v => !v);
      return;
    }
    if (key.keysym === VirtualKeyboardComponent.XK_ALT_L) {
      this.altActive.update(v => !v);
      return;
    }

    const shifted = this.isShifted();
    const needsCtrl = this.ctrlActive();
    const needsAlt = this.altActive();

    if (this.altGrActive()) {
      // AltGr level: press the bare physical key, the guest layout picks the third-level character.
      this.keyPress.emit({ keysym: key.keysym, code: key.code, needsShift: false, needsCtrl, needsAlt, needsAltGr: true });
    } else if (shifted && key.shiftKeysym) {
      this.keyPress.emit({ keysym: key.shiftKeysym, code: key.code, needsShift: true, needsCtrl, needsAlt });
    } else {
      this.keyPress.emit({ keysym: key.keysym, code: key.code, needsShift: false, needsCtrl, needsAlt });
    }

    // Auto-release modifiers after a key press (not caps lock)
    if (this.shiftActive()) {
      this.shiftActive.set(false);
    }
    if (this.ctrlActive()) {
      this.ctrlActive.set(false);
    }
    if (this.altActive()) {
      this.altActive.set(false);
    }
    if (this.altGrActive()) {
      this.altGrActive.set(false);
    }
  }

  isModifierActive(key: KeyDef): boolean {
    if (key.keysym === 0xffe1) return this.shiftActive();
    if (key.keysym === 0xffe5) return this.capsLock();
    if (key.keysym === VirtualKeyboardComponent.XK_CTRL_L) return this.ctrlActive();
    if (this.isAltGrKey(key)) return this.altGrActive();
    if (key.keysym === VirtualKeyboardComponent.XK_ALT_L) return this.altActive();
    return false;
  }
}
