import { Component, computed, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { provideRouter } from '@angular/router';
import { Product } from '@products/00_shared/models/product.model';

import { ProductTableWrapperComponent } from './product-table-wrapper.component';

interface Row {
  data: Product;
}

function makeRow(name: string): Row {
  return { data: { eid: name, productName: name, codeAZ: 'az1' } as Product };
}

describe('ProductTableWrapperComponent', () => {
  let component: ProductTableWrapperComponent<Row>;
  let fixture: ComponentFixture<ProductTableWrapperComponent<Row>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductTableWrapperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductTableWrapperComponent as Type<ProductTableWrapperComponent<Row>>);
    fixture.componentRef.setInput('columns', ['name']);
    fixture.componentRef.setInput('dataSource', new MatTableDataSource<Row>([]));
    component = fixture.componentInstance;
    // No detectChanges: this is a content-projection wrapper whose MatTable needs
    // projected column/row defs to render. Full rendering belongs in a host-based
    // test; here we just assert the component constructs.
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// The built-in empty state only exists once MatTable actually renders, so it needs a
// host supplying the column/row defs a real product list would project.
@Component({
  imports: [ProductTableWrapperComponent, MatTableModule],
  template: `
    <spx-product-table-wrapper
      [columns]="columns"
      [dataSource]="dataSource()"
      [emptyMessage]="emptyMessage()"
      [emptyCreateLabel]="emptyCreateLabel()"
      [canCreate]="canCreate()"
      [createLink]="createLink()"
      [actionsColumnWidth]="actionsColumnWidth()">
      <ng-container matColumnDef="actions" stickyEnd>
        <mat-header-cell *matHeaderCellDef></mat-header-cell>
        <mat-cell *matCellDef="let el"></mat-cell>
      </ng-container>

      <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
      <mat-row *matRowDef="let row; columns: columns"></mat-row>
    </spx-product-table-wrapper>
  `,
})
class HostComponent {
  readonly columns = ['name', 'actions'];
  readonly rows = signal<Row[]>([]);
  readonly emptyMessage = signal('No widgets yet.');
  readonly emptyCreateLabel = signal('Create a widget');
  readonly canCreate = signal(true);
  readonly createLink = signal('create');
  readonly actionsColumnWidth = signal<'single' | 'double'>('double');

  // Mirrors how every product list builds its data source: a fresh instance per change.
  readonly dataSource = computed(() => new MatTableDataSource<Row>(this.rows()));
}

describe('ProductTableWrapperComponent empty state', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function noDataRow(): HTMLElement | null {
    return fixture.nativeElement.querySelector('.mat-mdc-no-data-row');
  }

  it('renders the message and the create link when there is no data', () => {
    const row = noDataRow();
    expect(row).toBeTruthy();
    expect(row!.textContent).toContain('No widgets yet.');

    const link = row!.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.textContent!.trim()).toBe('Create a widget');
    expect(link!.getAttribute('href')).toContain('create');
  });

  it('hides the create link when the user cannot create', () => {
    host.canCreate.set(false);
    fixture.detectChanges();

    const row = noDataRow();
    expect(row!.textContent).toContain('No widgets yet.');
    expect(row!.querySelector('a')).toBeNull();
  });

  it('hides the create link when no label is supplied', () => {
    host.emptyCreateLabel.set('');
    fixture.detectChanges();

    expect(noDataRow()!.querySelector('a')).toBeNull();
  });

  it('supports an absolute create link for products created elsewhere', () => {
    host.createLink.set('/products/compute/instance');
    fixture.detectChanges();

    expect(noDataRow()!.querySelector('a')!.getAttribute('href')).toBe('/products/compute/instance');
  });

  it('sizes the trailing filler cell to match the actions column', () => {
    const filler = () => noDataRow()!.querySelectorAll('td')[1];
    expect(filler().classList).toContain('mat-column-actions--double-btn');

    host.actionsColumnWidth.set('single');
    fixture.detectChanges();
    expect(filler().classList).not.toContain('mat-column-actions--double-btn');
  });

  it('is not rendered once the table has rows', () => {
    host.rows.set([makeRow('a')]);
    fixture.detectChanges();

    expect(noDataRow()).toBeNull();
  });
});

// A list that still projects its own `*matNoDataRow` must keep winning over the default.
@Component({
  imports: [ProductTableWrapperComponent, MatTableModule],
  template: `
    <spx-product-table-wrapper [columns]="columns" [dataSource]="dataSource" emptyMessage="Default message">
      <ng-container matColumnDef="actions" stickyEnd>
        <mat-header-cell *matHeaderCellDef></mat-header-cell>
        <mat-cell *matCellDef="let el"></mat-cell>
      </ng-container>

      <tr class="d-flex mat-mdc-row" *matNoDataRow>
        <td class="mat-mdc-cell">Projected message</td>
      </tr>

      <mat-header-row *matHeaderRowDef="columns"></mat-header-row>
      <mat-row *matRowDef="let row; columns: columns"></mat-row>
    </spx-product-table-wrapper>
  `,
})
class OverrideHostComponent {
  readonly columns = ['name', 'actions'];
  readonly dataSource = new MatTableDataSource<Row>([]);
}

describe('ProductTableWrapperComponent projected no-data row', () => {
  it('takes precedence over the built-in empty state', async () => {
    await TestBed.configureTestingModule({
      imports: [OverrideHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(OverrideHostComponent);
    fixture.detectChanges();

    const row: HTMLElement = fixture.nativeElement.querySelector('.mat-mdc-no-data-row');
    expect(row.textContent).toContain('Projected message');
    expect(row.textContent).not.toContain('Default message');
  });
});
