import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { RunStrategy } from '@products/00_shared/models/compute/instance/enums/run-strategy.enum';
import { InstanceCreateRunStrategyHelperDialog } from './instance-create-run-strategy-helper-dialog.component';

describe('InstanceCreateRunStrategyHelperDialog', () => {
  let fixture: ComponentFixture<InstanceCreateRunStrategyHelperDialog>;
  let component: InstanceCreateRunStrategyHelperDialog;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<InstanceCreateRunStrategyHelperDialog>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [InstanceCreateRunStrategyHelperDialog],
      providers: [{ provide: MatDialogRef, useValue: dialogRefSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(InstanceCreateRunStrategyHelperDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should list all run strategies', () => {
    const strategyNames = component.strategies.map(s => s.name);
    expect(strategyNames).toContain(RunStrategy.Always);
    expect(strategyNames).toContain(RunStrategy.RerunOnFailure);
    expect(strategyNames).toContain(RunStrategy.Once);
    expect(strategyNames).toContain(RunStrategy.Manual);
    expect(strategyNames).toContain(RunStrategy.Halted);
    expect(component.strategies.length).toBe(5);
  });

  it('should clarify that Always keeps instance running by restarting it when it stops', () => {
    const alwaysStrategy = component.strategies.find(s => s.name === RunStrategy.Always);
    expect(alwaysStrategy).toBeDefined();
    expect(alwaysStrategy!.description).toContain('restarting it when it stops');
  });

  it('should clarify that Halted prevents the instance from booting', () => {
    const haltedStrategy = component.strategies.find(s => s.name === RunStrategy.Halted);
    expect(haltedStrategy).toBeDefined();
    expect(haltedStrategy!.description).toBe('The system will prevent the instance from booting.');
  });

  it('should render the dialog title and all strategies in the DOM', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2[mat-dialog-title]')?.textContent).toContain('Run Strategy Information');

    const headings = Array.from(compiled.querySelectorAll('div[mat-dialog-content] h2')).map(h =>
      h.textContent?.trim()
    );
    expect(headings).toEqual([
      RunStrategy.Always,
      RunStrategy.RerunOnFailure,
      RunStrategy.Once,
      RunStrategy.Manual,
      RunStrategy.Halted,
    ]);

    const descriptions = Array.from(compiled.querySelectorAll('div[mat-dialog-content] span')).map(s =>
      s.textContent?.trim()
    );
    expect(descriptions[0]).toContain('restarting it when it stops');
    expect(descriptions[4]).toBe('The system will prevent the instance from booting.');
  });
});
