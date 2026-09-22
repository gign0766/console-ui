import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VirtualKeyboardComponent } from './virtual-keyboard.component';

describe('VirtualKeyboardComponent', () => {
  let component: VirtualKeyboardComponent;
  let fixture: ComponentFixture<VirtualKeyboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualKeyboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualKeyboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render function row and 5 keyboard rows', () => {
    const rows = fixture.nativeElement.querySelectorAll('.virtual-keyboard__row');
    expect(rows.length).toBe(6); // 1 function row + 5 main rows
    const fnKeys = rows[0].querySelectorAll('.virtual-keyboard__key--fn');
    expect(fnKeys.length).toBe(13); // Esc + F1-F12
  });

  it('should emit keysym for a regular key click', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Click 'a' key (keysym 0x61) with the code of its position
    const aKey = component.rows()[2][1]; // home row, second key
    component.onKeyClick(aKey);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0x61, code: 'KeyA', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should emit uppercase keysym when shift is active', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Activate shift
    const shiftKey = component.rows()[3][0];
    component.onKeyClick(shiftKey);
    expect(component.shiftActive()).toBeTrue();

    // Click 'a' -> should emit 'A' (0x41)
    const aKey = component.rows()[2][1];
    component.onKeyClick(aKey);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0x41, code: 'KeyA', needsShift: true, needsCtrl: false, needsAlt: false });
    // Shift should auto-release
    expect(component.shiftActive()).toBeFalse();
  });

  it('should emit shift symbol when shift is active on symbol key', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Activate shift
    component.onKeyClick(component.rows()[3][0]);

    // Click '1' -> should emit '!' (0x21)
    const oneKey = component.rows()[0][1];
    component.onKeyClick(oneKey);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0x21, code: 'Digit1', needsShift: true, needsCtrl: false, needsAlt: false });
  });

  it('should toggle caps lock and keep it active after key press', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Activate caps lock
    const capsKey = component.rows()[2][0];
    component.onKeyClick(capsKey);
    expect(component.capsLock()).toBeTrue();

    // Click 'a' -> should emit 'A'
    component.onKeyClick(component.rows()[2][1]);
    expect(emitted[0]).toEqual({ keysym: 0x41, code: 'KeyA', needsShift: true, needsCtrl: false, needsAlt: false });

    // Caps lock should remain active
    expect(component.capsLock()).toBeTrue();

    // Click 'a' again -> still 'A'
    component.onKeyClick(component.rows()[2][1]);
    expect(emitted[1]).toEqual({ keysym: 0x41, code: 'KeyA', needsShift: true, needsCtrl: false, needsAlt: false });
  });

  it('should show shifted labels when shift is active', () => {
    expect(component.getKeyLabel(component.rows()[0][1])).toBe('1');

    component.onKeyClick(component.rows()[3][0]); // shift
    expect(component.getKeyLabel(component.rows()[0][1])).toBe('!');
    expect(component.getKeyLabel(component.rows()[2][1])).toBe('A');
  });

  it('should report modifier active state correctly', () => {
    const shiftKey = component.rows()[3][0];
    const capsKey = component.rows()[2][0];
    const aKey = component.rows()[2][1];

    expect(component.isModifierActive(shiftKey)).toBeFalse();
    expect(component.isModifierActive(capsKey)).toBeFalse();
    expect(component.isModifierActive(aKey)).toBeFalse();

    component.onKeyClick(shiftKey);
    expect(component.isModifierActive(shiftKey)).toBeTrue();

    component.onKeyClick(capsKey);
    expect(component.isModifierActive(capsKey)).toBeTrue();
  });

  it('should emit function key keysym with code on click', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Click F1 (index 1 in functionRow, after Esc)
    component.onKeyClick(component.functionRow[1]);
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0xffbe, code: 'F1', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should emit Escape keysym with code on Esc click', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    component.onKeyClick(component.functionRow[0]);
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0xff1b, code: 'Escape', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should emit special keys like Enter and Backspace with code', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Enter key
    const enterKey = component.rows()[2][12];
    component.onKeyClick(enterKey);
    expect(emitted[0]).toEqual({ keysym: 0xff0d, code: 'Enter', needsShift: false, needsCtrl: false, needsAlt: false });

    // Backspace key
    const bsKey = component.rows()[0][13];
    component.onKeyClick(bsKey);
    expect(emitted[1]).toEqual({ keysym: 0xff08, code: 'Backspace', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should toggle Ctrl and emit needsCtrl with key press', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Activate Ctrl
    const ctrlKey = component.rows()[4][0];
    component.onKeyClick(ctrlKey);
    expect(component.ctrlActive()).toBeTrue();
    expect(component.isModifierActive(ctrlKey)).toBeTrue();

    // Click 'v' -> should emit with needsCtrl: true (index 5: Shift, z, x, c, v)
    const vKey = component.rows()[3][4];
    component.onKeyClick(vKey);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0x76, code: 'KeyV', needsShift: false, needsCtrl: true, needsAlt: false });
    // Ctrl should auto-release
    expect(component.ctrlActive()).toBeFalse();
  });

  it('should toggle Alt and emit needsAlt with key press', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    // Activate Alt
    const altKey = component.rows()[4][1];
    component.onKeyClick(altKey);
    expect(component.altActive()).toBeTrue();
    expect(component.isModifierActive(altKey)).toBeTrue();

    // Click 'a'
    const aKey = component.rows()[2][1];
    component.onKeyClick(aKey);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual({ keysym: 0x61, code: 'KeyA', needsShift: false, needsCtrl: false, needsAlt: true });
    // Alt should auto-release
    expect(component.altActive()).toBeFalse();
  });

  it('should emit arrow key keysyms with code', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    component.onKeyClick(component.arrowKeys.up);
    expect(emitted[0]).toEqual({ keysym: 0xff52, code: 'ArrowUp', needsShift: false, needsCtrl: false, needsAlt: false });

    component.onKeyClick(component.arrowKeys.left);
    expect(emitted[1]).toEqual({ keysym: 0xff51, code: 'ArrowLeft', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  it('should render arrow keys in inverted-T layout', () => {
    const arrowsTop = fixture.nativeElement.querySelectorAll('.virtual-keyboard__arrows-top .virtual-keyboard__key--arrow');
    const arrowsBottom = fixture.nativeElement.querySelectorAll('.virtual-keyboard__arrows-bottom .virtual-keyboard__key--arrow');
    expect(arrowsTop.length).toBe(1); // up arrow
    expect(arrowsBottom.length).toBe(3); // left, down, right
  });

  it('should render nav keys (Ins, Del, PgUp, PgDn) in a 2x2 grid above arrow keys', () => {
    const navKeys = fixture.nativeElement.querySelectorAll('.virtual-keyboard__nav-row .virtual-keyboard__key--nav');
    expect(navKeys.length).toBe(4);
    expect(navKeys[0].textContent.trim()).toBe('Ins');
    expect(navKeys[1].textContent.trim()).toBe('PgUp');
    expect(navKeys[2].textContent.trim()).toBe('Del');
    expect(navKeys[3].textContent.trim()).toBe('PgDn');
  });

  it('should emit PgUp keysym with code on click', () => {
    const emitted: { keysym: number; code?: string; needsShift: boolean; needsCtrl: boolean; needsAlt: boolean }[] = [];
    component.keyPress.subscribe(e => emitted.push(e));

    component.onKeyClick(component.navKeys[1]);
    expect(emitted[0]).toEqual({ keysym: 0xff55, code: 'PageUp', needsShift: false, needsCtrl: false, needsAlt: false });
  });

  describe('French layout', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('layout', 'french');
      fixture.detectChanges();
    });

    it('should show AZERTY labels for the default and shift levels', () => {
      const aKey = component.rows()[1][1];
      const zeroKey = component.rows()[0][10];
      expect(component.getKeyLabel(aKey)).toBe('a');
      expect(component.getKeyLabel(zeroKey)).toBe('à');

      component.onKeyClick(component.rows()[3][0]); // shift
      expect(component.getKeyLabel(aKey)).toBe('A');
      expect(component.getKeyLabel(zeroKey)).toBe('0');
      component.onKeyClick(component.rows()[3][0]);

      // The layout data has no AltGr level: labels stay on the default one
      component.onKeyClick(component.rows()[4][4]); // AltGr
      expect(component.getKeyLabel(zeroKey)).toBe('à');
    });

    it('should emit the physical position of the clicked key', () => {
      const emitted: unknown[] = [];
      component.keyPress.subscribe(e => emitted.push(e));
      const aKey = component.rows()[1][1];
      const zeroKey = component.rows()[0][10];
      const altGrKey = component.rows()[4][4];

      component.onKeyClick(aKey);
      component.onKeyClick(component.rows()[3][0]); // shift
      component.onKeyClick(aKey);
      component.onKeyClick(altGrKey);
      expect(component.isModifierActive(altGrKey)).toBeTrue();
      component.onKeyClick(zeroKey);

      expect(emitted).toEqual([
        { keysym: 0x61, code: 'KeyQ', needsShift: false, needsCtrl: false, needsAlt: false },
        { keysym: 0x41, code: 'KeyQ', needsShift: true, needsCtrl: false, needsAlt: false },
        { keysym: 0xe0, code: 'Digit0', needsShift: false, needsCtrl: false, needsAlt: false, needsAltGr: true },
      ]);
      // AltGr should auto-release
      expect(component.altGrActive()).toBeFalse();
    });
  });

  it('should offer a sticky AltGr on every layout', () => {
    const altGrKey = component.rows()[4][4];
    component.onKeyClick(altGrKey);
    expect(component.altGrActive()).toBeTrue();
    expect(component.altActive()).toBeFalse();
  });
});
