import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { VirtualKeyboardComponent } from './virtual-keyboard/virtual-keyboard.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute } from '@angular/router';
import { CONTROLLER_PATH, WS_PROTOCOL, environment } from '@env/environment';
import { SESSION_TOKEN_URL } from '@shared/services/auth.service';
import * as RFB from '@novnc/novnc/lib/rfb';
import { Session } from '@shared/models/data/user';
import { firstValueFrom } from 'rxjs';
import { FR_CHAR_MAP, GUEST_LAYOUTS, GuestLayoutId, KeyStroke, usKeysym } from './keyboard-layouts';

const GUEST_LAYOUT_STORAGE_PREFIX = 'spx.vnc.guestLayout.';

@Component({
  selector: 'spx-vnc',
  imports: [MatButtonModule, MatIcon, MatMenuModule, VirtualKeyboardComponent],
  templateUrl: './vnc.component.html',
  styleUrl: './vnc.component.scss',
})
export class VNCComponent implements OnInit {
  private http = inject(HttpClient);

  destroyRef = inject(DestroyRef);

  orgaId!: string;
  projectId!: string;

  vmName: string | null;
  codeAz: string | null;

  statusElement = viewChild<ElementRef<HTMLElement>>('status');
  screenContainer = viewChild<ElementRef<HTMLElement>>('screen');
  desktopName?: string;

  rfb?: RFB.default;

  showVirtualKeyboard = signal(false);

  // Keyboard layout configured inside the guest OS. VNC does not expose it, so the user picks it
  // and we store the choice per VM.
  readonly guestLayouts = GUEST_LAYOUTS;
  guestLayout = signal<GuestLayoutId>('us');
  guestLayoutShort = computed(() => GUEST_LAYOUTS.find(l => l.id === this.guestLayout())?.short ?? '');

  constructor() {
    const route = inject(ActivatedRoute);

    this.orgaId = route.snapshot.paramMap.get('orgId') || '';
    this.projectId = route.snapshot.paramMap.get('projectId') || '';
    this.codeAz = route.snapshot.paramMap.get('az') || '';
    this.vmName = route.snapshot.paramMap.get('productId') || '';

    this.guestLayout.set(this.readStoredGuestLayout());

    this.destroyRef.onDestroy(() => this.cleanup());
  }

  private readStoredGuestLayout(): GuestLayoutId {
    try {
      const stored = localStorage.getItem(GUEST_LAYOUT_STORAGE_PREFIX + this.vmName);
      return GUEST_LAYOUTS.find(l => l.id === stored)?.id ?? 'us';
    } catch {
      return 'us';
    }
  }

  setGuestLayout(layout: GuestLayoutId) {
    this.guestLayout.set(layout);
    try {
      localStorage.setItem(GUEST_LAYOUT_STORAGE_PREFIX + this.vmName, layout);
    } catch {
      // Storage unavailable: the choice lasts until the page closes.
    }
    // Let the menu close and restore focus first, then give focus back to the canvas.
    setTimeout(() => this.rfb?.focus());
  }

  ngOnInit() {
    if (this.vmName) {
      this.initVNC();
    } else {
      console.log('Failed to initialize connection');
    }
  }

  async initVNC() {
    let res: Session;
    try {
      res = await firstValueFrom(this.http.get<Session>(SESSION_TOKEN_URL, { withCredentials: true }));
    } catch (err) {
      console.error('Failed to retrieve session token', err);
      this.updateStatus('Error: Unable to authenticate. Please refresh the page.');
      return;
    }

    const accessToken = res.session;
    const wsUrl = `${WS_PROTOCOL}${environment.apiUrl}/${this.orgaId}${CONTROLLER_PATH}/${this.codeAz}/${this.projectId}/instance/${this.vmName}/vnc?bearer=${accessToken}`;

    const container = this.screenContainer()?.nativeElement;
    if (!container) {
      console.error('VNC screen container element not found');
      return;
    }

    try {
      this.rfb = new RFB.default(container, wsUrl);
      this.bindKeyEventModeToGuestLayout(this.rfb);
      this.rfb.viewOnly = false;
      this.rfb.scaleViewport = true;

      this.rfb.addEventListener('connect', this.connectedToServer.bind(this));
      this.rfb.addEventListener('disconnect', this.disconnectedFromServer.bind(this));
      this.rfb.addEventListener('desktopname', this.updateDesktopName.bind(this));

      this.updateStatus('Connecting...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error creating RFB:', err);
      this.updateStatus('Error: ' + err.message);
    }
  }

  refreshSession() {
    if (this.rfb) {
      console.log('disconnecting previous session');
      this.rfb.disconnect();
    }
    this.initVNC();
  }

  updateStatus(text: string) {
    if (this.statusElement()) {
      this.statusElement()!.nativeElement.textContent = text;
    }
  }

  // noVNC sends physical scancodes when the server supports QEMU extended key events, and
  // keysyms (characters) otherwise. Each mode suits one kind of guest:
  //  - QEMU converts keysyms back to scancodes with its `en-us` keymap, so they type the
  //    expected character on a guest configured with a US layout;
  //  - scancodes are key positions, so they type the expected character when the guest layout
  //    matches the user's physical keyboard (e.g. AZERTY keyboard and French Windows guest).
  // We force the keysym path for US guests and follow the server capability for the others.
  // noVNC has no public option for this, so we replace its private flag with an accessor. The
  // accessor keeps recording what the server announces, which lets the user switch layout live.
  private bindKeyEventModeToGuestLayout(rfb: RFB.default) {
    let serverSupportsExtKeys = false;
    Object.defineProperty(rfb, '_qemuExtKeyEventSupported', {
      get: () => serverSupportsExtKeys && this.guestLayout() !== 'us',
      set: (supported: boolean) => {
        serverSupportsExtKeys = supported;
      },
      configurable: true,
    });
  }

  connectedToServer() {
    this.updateStatus('Connected to ' + this.desktopName);
  }

  disconnectedFromServer(e: { detail: { clean: string } }) {
    if (e.detail.clean) {
      this.updateStatus('Disconnected cleanly');
    } else {
      this.updateStatus('Connection error');
    }
  }

  // credentialsAreRequired() {
  //   if (this.rfb) {
  //     const password = prompt('Password required:');
  //     this.rfb.sendCredentials({ password });
  //   }
  // }

  updateDesktopName(e: { detail: { name: string } }) {
    this.desktopName = e.detail.name;
  }

  sendCtrlAltDel() {
    if (this.rfb) {
      this.rfb.sendCtrlAltDel();
    }
    return false;
  }

  // Characters that require Shift on a standard US keyboard layout.
  // The VNC server may not interpret keysyms for shifted characters
  // correctly without explicit Shift key events.
  private static readonly SHIFTED_CHARS = new Set(
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+{}|:"<>?'
  );

  private static readonly XK_SHIFT_L = 0xffe1;
  private static readonly XK_ALT_R = 0xffea;

  async paste() {
    if (!this.rfb) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      if (this.guestLayout() === 'fr') {
        this.typeWithCharMap(text, FR_CHAR_MAP);
        return;
      }

      // US guest: send each character as a keysym with null code, QEMU's
      // en-us keymap turns it into the right key. This types the text into
      // the VM, whereas clipboardPasteFrom sets the server clipboard and
      // types nothing.
      for (const char of text) {
        const codePoint = char.codePointAt(0);
        if (codePoint === undefined) continue;

        let keysym: number;
        if (codePoint === 0x0a) {
          // Line feed -> Return
          keysym = 0xff0d;
        } else if (codePoint === 0x09) {
          // Tab
          keysym = 0xff09;
        } else if (codePoint === 0x08) {
          // Backspace
          keysym = 0xff08;
        } else if (codePoint >= 0x20 && codePoint <= 0x7e) {
          // Printable ASCII maps directly to keysym
          keysym = codePoint;
        } else if (codePoint >= 0xa0 && codePoint <= 0xff) {
          // Latin-1 supplement maps directly to keysym
          keysym = codePoint;
        } else if (codePoint >= 0x100) {
          // Unicode keysym: add 0x01000000 offset
          keysym = 0x01000000 | codePoint;
        } else {
          continue;
        }

        // Some VNC servers don't properly handle keysyms for shifted
        // characters (e.g. uppercase letters, @, #, !) without explicit
        // Shift key events. Wrap those characters with Shift down/up.
        const needsShift = VNCComponent.SHIFTED_CHARS.has(char);
        if (needsShift) {
          this.rfb.sendKey(VNCComponent.XK_SHIFT_L, null, true);
        }
        this.rfb.sendKey(keysym, null, true);
        this.rfb.sendKey(keysym, null, false);
        if (needsShift) {
          this.rfb.sendKey(VNCComponent.XK_SHIFT_L, null, false);
        }
      }
    } catch (err) {
      console.error('Clipboard error:', err);
      alert('Unable to read the clipboard.');
    }
  }

  // Types text on a non-US guest by pressing the physical keys that produce each character on
  // the guest layout.
  private typeWithCharMap(text: string, charMap: Record<string, KeyStroke>) {
    const skipped = new Set<string>();
    for (const char of text.replace(/\r\n?/g, '\n')) {
      const stroke = charMap[char];
      if (stroke) {
        this.sendStroke(stroke);
      } else {
        skipped.add(char);
      }
    }
    if (skipped.size) {
      console.warn('Characters not typeable with the guest keyboard layout were skipped:', [...skipped].join(' '));
    }
  }

  private sendStroke(stroke: KeyStroke) {
    if (!this.rfb) return;
    const keysym = usKeysym(stroke.code, !!stroke.shift);

    if (stroke.shift) {
      this.rfb.sendKey(VNCComponent.XK_SHIFT_L, 'ShiftLeft', true);
    }
    if (stroke.altGr) {
      this.rfb.sendKey(VNCComponent.XK_ALT_R, 'AltRight', true);
    }
    this.rfb.sendKey(keysym, stroke.code, true);
    this.rfb.sendKey(keysym, stroke.code, false);
    if (stroke.altGr) {
      this.rfb.sendKey(VNCComponent.XK_ALT_R, 'AltRight', false);
    }
    if (stroke.shift) {
      this.rfb.sendKey(VNCComponent.XK_SHIFT_L, 'ShiftLeft', false);
    }

    if (stroke.then) {
      this.sendStroke(stroke.then);
    }
  }

  toggleVirtualKeyboard() {
    this.showVirtualKeyboard.update(v => !v);

    // After the DOM updates (keyboard shown/hidden), re-trigger the VNC
    // viewport scaling so the display adapts to the new available space.
    setTimeout(() => {
      if (this.rfb) {
        this.rfb.scaleViewport = this.rfb.scaleViewport;
      }
    });
  }

  private static readonly XK_CTRL_L = 0xffe3;
  private static readonly XK_ALT_L = 0xffe9;

  onVirtualKeyPress(event: {
    keysym: number;
    code?: string;
    needsShift: boolean;
    needsCtrl: boolean;
    needsAlt: boolean;
    needsAltGr?: boolean;
  }) {
    if (!this.rfb) return;

    // Use the DOM code string when available so that noVNC can send
    // the proper scancode for non-printable keys (F1-F12, arrows, etc.).
    // Printable keys of the US layout omit code to stay on the keysym path;
    // those of the other layouts carry the code of their physical position.
    const code = event.code ?? null;

    if (event.needsCtrl) {
      this.rfb.sendKey(VNCComponent.XK_CTRL_L, 'ControlLeft', true);
    }
    if (event.needsAlt) {
      this.rfb.sendKey(VNCComponent.XK_ALT_L, 'AltLeft', true);
    }
    if (event.needsShift) {
      this.rfb.sendKey(VNCComponent.XK_SHIFT_L, 'ShiftLeft', true);
    }
    if (event.needsAltGr) {
      this.rfb.sendKey(VNCComponent.XK_ALT_R, 'AltRight', true);
    }
    this.rfb.sendKey(event.keysym, code, true);
    this.rfb.sendKey(event.keysym, code, false);
    if (event.needsAltGr) {
      this.rfb.sendKey(VNCComponent.XK_ALT_R, 'AltRight', false);
    }
    if (event.needsShift) {
      this.rfb.sendKey(VNCComponent.XK_SHIFT_L, 'ShiftLeft', false);
    }
    if (event.needsAlt) {
      this.rfb.sendKey(VNCComponent.XK_ALT_L, 'AltLeft', false);
    }
    if (event.needsCtrl) {
      this.rfb.sendKey(VNCComponent.XK_CTRL_L, 'ControlLeft', false);
    }
  }

  private cleanup() {
    if (this.rfb) {
      this.rfb.disconnect();
      this.rfb = undefined;
    }
  }
}
