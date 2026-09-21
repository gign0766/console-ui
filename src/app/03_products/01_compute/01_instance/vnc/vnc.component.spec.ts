import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { VNCComponent } from './vnc.component';

describe('VNCComponent', () => {
  let component: VNCComponent;
  let fixture: ComponentFixture<VNCComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VNCComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VNCComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not initialize VNC when vmName is empty', () => {
    spyOn(component, 'initVNC');
    component.vmName = '';
    component.ngOnInit();
    expect(component.initVNC).not.toHaveBeenCalled();
  });

  it('should call initVNC when vmName is set', () => {
    spyOn(component, 'initVNC');
    component.vmName = 'test-vm';
    component.ngOnInit();
    expect(component.initVNC).toHaveBeenCalled();
  });

  it('should wrap uppercase letters with Shift key events during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('Ab'));

    await component.paste();

    // 'A' needs Shift: Shift down, A down, A up, Shift up = 4 calls
    // 'b' no Shift: b down, b up = 2 calls
    expect(mockRfb.sendKey).toHaveBeenCalledTimes(6);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe1, 'ShiftLeft', true]);  // Shift down
    expect(calls[1]).toEqual([0x41, 'KeyA', true]);     // A down
    expect(calls[2]).toEqual([0x41, 'KeyA', false]);    // A up
    expect(calls[3]).toEqual([0xffe1, 'ShiftLeft', false]);  // Shift up
    expect(calls[4]).toEqual([0x62, 'KeyB', true]);     // b down
    expect(calls[5]).toEqual([0x62, 'KeyB', false]);    // b up
  });

  it('should convert newlines to Return keysym during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('a\nb'));

    await component.paste();

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(6);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, 'KeyA', true); // 'a' down
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, 'KeyA', false); // 'a' up
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xff0d, 'Enter', true); // Return down
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xff0d, 'Enter', false); // Return up
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x62, 'KeyB', true); // 'b' down
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x62, 'KeyB', false); // 'b' up
  });

  it('should skip characters missing from the guest layout during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;
    spyOn(component, 'updateStatus');

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('é'));

    await component.paste();

    // 'é' is not on the default English (US) layout
    expect(mockRfb.sendKey).not.toHaveBeenCalled();
    expect(component.updateStatus).toHaveBeenCalledWith(jasmine.stringMatching(/é$/));
  });

  it('should wrap shifted symbols with Shift key events during paste', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('@#'));

    await component.paste();

    // '@' and '#' are shifted chars: each gets Shift down, key down, key up, Shift up
    expect(mockRfb.sendKey).toHaveBeenCalledTimes(8);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe1, 'ShiftLeft', true]);  // Shift down
    expect(calls[1]).toEqual([0x40, 'Digit2', true]);     // @ down
    expect(calls[2]).toEqual([0x40, 'Digit2', false]);    // @ up
    expect(calls[3]).toEqual([0xffe1, 'ShiftLeft', false]);  // Shift up
    expect(calls[4]).toEqual([0xffe1, 'ShiftLeft', true]);   // Shift down
    expect(calls[5]).toEqual([0x23, 'Digit3', true]);     // # down
    expect(calls[6]).toEqual([0x23, 'Digit3', false]);    // # up
    expect(calls[7]).toEqual([0xffe1, 'ShiftLeft', false]);  // Shift up
  });

  it('should not paste when rfb is not initialized', async () => {
    component.rfb = undefined;
    spyOn(navigator.clipboard, 'readText');

    await component.paste();

    expect(navigator.clipboard.readText).not.toHaveBeenCalled();
  });

  it('should disconnect rfb on cleanup', () => {
    const mockRfb = {
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    fixture.destroy();

    expect(mockRfb.disconnect).toHaveBeenCalled();
  });

  it('should paste through the key positions of the guest layout', async () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;
    component.guestLayout.set('french');
    spyOn(component, 'updateStatus');

    spyOn(navigator.clipboard, 'readText').and.returnValue(Promise.resolve('a@A\n'));

    await component.paste();

    expect(mockRfb.sendKey.calls.allArgs()).toEqual([
      // 'a' is on the US 'q' key
      [0x61, 'KeyQ', true],
      [0x61, 'KeyQ', false],
      // '@' needs AltGr, which the layout data does not cover: skipped
      // 'A' is Shift + the US 'q' key
      [0xffe1, 'ShiftLeft', true],
      [0x41, 'KeyQ', true],
      [0x41, 'KeyQ', false],
      [0xffe1, 'ShiftLeft', false],
      [0xff0d, 'Enter', true],
      [0xff0d, 'Enter', false],
    ]);
    expect(component.updateStatus).toHaveBeenCalledWith(jasmine.stringMatching(/French.*: @$/));
  });

  it('should remember the guest layout per VM', () => {
    component.vmName = 'spec-vm';
    spyOn(localStorage, 'setItem');

    component.setGuestLayout('french');

    expect(component.guestLayout()).toBe('french');
    expect(localStorage.setItem).toHaveBeenCalledWith('spx.vnc.guestLayout.spec-vm', 'french');
  });

  it('should wrap the key with AltGr via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({
      keysym: 0x30,
      code: 'Digit0',
      needsShift: false,
      needsCtrl: false,
      needsAlt: false,
      needsAltGr: true,
    });

    expect(mockRfb.sendKey.calls.allArgs()).toEqual([
      [0xffea, 'AltRight', true],
      [0x30, 'Digit0', true],
      [0x30, 'Digit0', false],
      [0xffea, 'AltRight', false],
    ]);
  });

  it('should toggle virtual keyboard visibility', () => {
    expect(component.showVirtualKeyboard()).toBeFalse();
    component.toggleVirtualKeyboard();
    expect(component.showVirtualKeyboard()).toBeTrue();
    component.toggleVirtualKeyboard();
    expect(component.showVirtualKeyboard()).toBeFalse();
  });

  it('should re-trigger scaleViewport after toggling virtual keyboard', (done) => {
    let scaleValue = true;
    const mockRfb = {
      get scaleViewport() { return scaleValue; },
      set scaleViewport(v: boolean) { scaleValue = v; },
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;
    const spy = spyOnProperty(mockRfb, 'scaleViewport', 'set').and.callThrough();

    component.toggleVirtualKeyboard();

    setTimeout(() => {
      expect(spy).toHaveBeenCalled();
      done();
    });
  });

  it('should send keysym via onVirtualKeyPress without shift', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0x61, code: 'KeyA', needsShift: false, needsCtrl: false, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(2);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, 'KeyA', true);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0x61, 'KeyA', false);
  });

  it('should send keysym with shift wrapping via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0x41, code: 'KeyA', needsShift: true, needsCtrl: false, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(4);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe1, 'ShiftLeft', true]);  // Shift down
    expect(calls[1]).toEqual([0x41, 'KeyA', true]);            // A down
    expect(calls[2]).toEqual([0x41, 'KeyA', false]);           // A up
    expect(calls[3]).toEqual([0xffe1, 'ShiftLeft', false]); // Shift up
  });

  it('should send keysym with Ctrl wrapping via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0x76, needsShift: false, needsCtrl: true, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(4);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe3, 'ControlLeft', true]);  // Ctrl down
    expect(calls[1]).toEqual([0x76, null, true]);              // v down
    expect(calls[2]).toEqual([0x76, null, false]);             // v up
    expect(calls[3]).toEqual([0xffe3, 'ControlLeft', false]); // Ctrl up
  });

  it('should send keysym with Ctrl+Alt wrapping via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0xffff, code: 'Delete', needsShift: false, needsCtrl: true, needsAlt: true });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(6);
    const calls = mockRfb.sendKey.calls.allArgs();
    expect(calls[0]).toEqual([0xffe3, 'ControlLeft', true]);  // Ctrl down
    expect(calls[1]).toEqual([0xffe9, 'AltLeft', true]);      // Alt down
    expect(calls[2]).toEqual([0xffff, 'Delete', true]);       // Del down
    expect(calls[3]).toEqual([0xffff, 'Delete', false]);      // Del up
    expect(calls[4]).toEqual([0xffe9, 'AltLeft', false]);     // Alt up
    expect(calls[5]).toEqual([0xffe3, 'ControlLeft', false]); // Ctrl up
  });

  it('should send function key F1 with scancode via onVirtualKeyPress', () => {
    const mockRfb = {
      sendKey: jasmine.createSpy('sendKey'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.onVirtualKeyPress({ keysym: 0xffbe, code: 'F1', needsShift: false, needsCtrl: false, needsAlt: false });

    expect(mockRfb.sendKey).toHaveBeenCalledTimes(2);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xffbe, 'F1', true);
    expect(mockRfb.sendKey).toHaveBeenCalledWith(0xffbe, 'F1', false);
  });

  it('should not send keysym via onVirtualKeyPress when rfb is undefined', () => {
    component.rfb = undefined;
    // Should not throw
    component.onVirtualKeyPress({ keysym: 0x61, code: 'KeyA', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should send Ctrl+Alt+Del when rfb is connected', () => {
    const mockRfb = {
      sendCtrlAltDel: jasmine.createSpy('sendCtrlAltDel'),
      disconnect: jasmine.createSpy('disconnect'),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component.rfb = mockRfb as any;

    component.sendCtrlAltDel();

    expect(mockRfb.sendCtrlAltDel).toHaveBeenCalled();
  });
});
