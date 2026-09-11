import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { BannerComponent } from '@shared/components/banner/banner.component';
import { ContentHeaderComponent } from '@shared/components/content-header/content-header.component';
import { ScreenService } from '@shared/services/screen.service';
import { StateService } from '@shared/services/state.service';
import { ChangelogComponent } from '../changelog/changelog.component';
import { Announcement, environment } from '@env/environment';
import { BannerLevelEnum } from '@shared/models/enums';
import { AZService } from '@products/00_shared/services/az.service';
import {
  getProduct,
  getProductTitle,
  ProductCompute,
  ProductNetwork,
  ProductPaas,
  ProductStorage,
} from '@shared/models/data/product.enum';
import { catchError, of } from 'rxjs';
import { DashboardService, RecentProduct } from '../dashboard.service';

/**
 * A dashboard card: one product category, and the product types its count sums up.
 * The product types are the ones returned by the API summary endpoint.
 */
interface CategoryCard {
  title: string;
  icon: string;
  link: string[];
  /** Create page of the category's main product, offered as a shortcut on the card. */
  createLink: string[];
  productTypes: string[];
}

const CATEGORY_CARDS: CategoryCard[] = [
  {
    title: ProductCompute.title,
    icon: ProductCompute.icon,
    link: ['/products', ProductCompute.baseLink, ProductCompute.items[0].link],
    createLink: ['/products', ProductCompute.baseLink, 'instance', 'create'],
    productTypes: ['instance', 'vmSnapshot'],
  },
  {
    title: ProductStorage.title,
    icon: ProductStorage.icon,
    link: ['/products', ProductStorage.baseLink, ProductStorage.items[0].link],
    createLink: ['/products', ProductStorage.baseLink, 'disk', 'create'],
    productTypes: ['disk', 'snapshot', 'baas', 'bucket'],
  },
  {
    title: ProductNetwork.title,
    icon: ProductNetwork.icon,
    link: ['/products', ProductNetwork.baseLink, ProductNetwork.items[0].link],
    createLink: ['/products', ProductNetwork.baseLink, 'vpc', 'create'],
    productTypes: ['vpc', 'subnet', 'eip', 'loadBalancer', 'securityGroup'],
  },
  {
    title: ProductPaas.title,
    icon: ProductPaas.icon,
    link: ['/products', ProductPaas.baseLink, ProductPaas.items[0].link],
    createLink: ['/products', ProductPaas.baseLink, 'kaas', 'create'],
    productTypes: ['kaas'],
  },
];

/**
 * Product types with no details page: their rows link to the product list instead.
 * Keep in sync with the routes of `03_products`.
 */
const TYPES_WITHOUT_DETAILS = ['ssh'];

/** Above this share of the quota, the meter is highlighted so the limit becomes noticeable. */
const QUOTA_WARN_PERCENT = 80;

@Component({
  selector: 'spx-dashboard',
  imports: [
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    RouterLink,
    BannerComponent,
    ContentHeaderComponent,
    ChangelogComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected stateSvc = inject(StateService);
  protected screenSvc = inject(ScreenService);
  private dashboardSvc = inject(DashboardService);

  protected announcement: Announcement | undefined = environment.announcement;

  protected announcementText = computed(() => this.announcement?.longText ?? this.announcement?.text ?? '');

  /** Severity of the configured announcement, as a banner level. */
  protected announcementLevel = computed(() => {
    switch (this.announcement?.severity) {
      case 'warn':
        return BannerLevelEnum.Warn;
      case 'error':
        return BannerLevelEnum.Error;
      default:
        return BannerLevelEnum.Info;
    }
  });

  /**
   * Resource overview of the current project, in a single request.
   * Re-fetched only when the organization or the project changes.
   */
  protected summary = rxResource({
    params: computed(() => [this.stateSvc.organization(), this.stateSvc.project()]),
    stream: () => {
      const org = this.stateSvc.organization();
      const project = this.stateSvc.project();
      if (!org || !project) {
        return of(undefined);
      }

      return this.dashboardSvc.getSummary(org.id, project.id).pipe(
        catchError(err => {
          console.error(err);
          return of(undefined);
        })
      );
    },
  });

  /**
   * The cards to display. A category is dropped when the API returned none of its product types,
   * which means the user is not allowed to read any of them.
   */
  protected cards = computed(() => {
    const counts = this.summary.value()?.counts;
    if (!counts) {
      return CATEGORY_CARDS.map(card => ({ ...card, value: undefined }));
    }

    return CATEGORY_CARDS.filter(card => card.productTypes.some(type => type in counts)).map(card => ({
      ...card,
      value: card.productTypes.reduce((total, type) => total + (counts[type] ?? 0), 0),
    }));
  });

  /** Product creation quota of the project, with the percentage to fill the bar with. */
  protected quota = computed(() => {
    const quota = this.summary.value()?.quota;
    if (!quota || quota.limit <= 0) {
      return undefined;
    }

    const percent = Math.min(100, Math.round((quota.used / quota.limit) * 100));
    return { ...quota, percent, nearLimit: percent >= QUOTA_WARN_PERCENT };
  });

  /** Last created resources, with their label, their AZ logo and the page to open. */
  protected recent = computed(() => {
    const azList = this.stateSvc.azList();
    return (this.summary.value()?.recent ?? []).map(product => ({
      ...product,
      typeTitle: getProductTitle(product.productType),
      logoUrl: AZService.getLogoUrl(product.codeAz, azList),
      link: this.recentLink(product),
    }));
  });

  /**
   * The AZs the project actually holds resources in, busiest first. An AZ the project has nothing
   * in is not listed at all: the API only reports the ones in use.
   */
  protected zones = computed(() => {
    const countsByAz = this.summary.value()?.countsByAz ?? {};
    const azList = this.stateSvc.azList();

    return Object.entries(countsByAz)
      .map(([code, count]) => ({
        code,
        // An AZ missing from the list is still worth showing, under its code.
        name: azList.find(az => az.code === code)?.name ?? code,
        logoUrl: AZService.getLogoUrl(code, azList),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
  });

  /** Deep link to a recent resource: its details page, or the product list when it has none. */
  private recentLink(product: RecentProduct) {
    const path = getProduct(product.productType);
    if (!path) {
      return undefined;
    }
    if (TYPES_WITHOUT_DETAILS.includes(product.productType)) {
      return ['/products', ...path.split('/')];
    }
    return ['/products', ...path.split('/'), 'details', product.codeAz, product.eid];
  }
}
