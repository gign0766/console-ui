import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductBucket } from '@products/00_shared/models/product.model';
import { isBucketBound } from '../../bucket-actions.utils';
import { BucketDetailsConnectComponent } from './bucket-details-connect.component';

function bucket(phase?: string): ProductBucket {
  return {
    id: '1',
    eid: 'bucket-1',
    productName: 'bucket-1',
    gitops: 'false',
    bucket: { name: 'bucket-1', storageClass: 'std', phase },
  };
}

describe('BucketDetailsConnectComponent', () => {
  let component: BucketDetailsConnectComponent;
  let fixture: ComponentFixture<BucketDetailsConnectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BucketDetailsConnectComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(BucketDetailsConnectComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('bucket', bucket('Pending'));
    fixture.componentRef.setInput('az', 'az1');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('treats only the Bound phase as ready', () => {
    expect(isBucketBound('Bound')).toBe(true);
    expect(isBucketBound('Pending')).toBe(false);
    expect(isBucketBound(undefined)).toBe(false);

    expect(component.isBound()).toBe(false);
    fixture.componentRef.setInput('bucket', bucket('Bound'));
    expect(component.isBound()).toBe(true);
  });

  it('shows the provisioning message instead of the CLI snippets while not bound', async () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('still provisioning');
    expect(text).not.toContain('<endpoint>');

    fixture.componentRef.setInput('bucket', bucket('Bound'));
    await fixture.whenStable();
    fixture.detectChanges();
    const boundText = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(boundText).not.toContain('still provisioning');
  });
});
