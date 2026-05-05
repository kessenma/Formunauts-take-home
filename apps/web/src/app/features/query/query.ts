import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/services/language';
import { DonationService } from '../../core/services/donation';
import type { ViewMode } from '../../core/services/donation';
import { CampaignService } from '../../core/services/campaign';
import { DonorService } from '../../core/services/donor';
import { FundraiserService } from '../../core/services/fundraiser';
import { OrganizationService } from '../../core/services/organization';
import { DonationTable } from './components/donation-table/donation-table';
import { DonorTable } from './components/donor-table/donor-table';
import { FundraiserTable } from './components/fundraiser-table/fundraiser-table';
import { CampaignTable } from './components/campaign-table/campaign-table';
import { OrganizationTable } from './components/organization-table/organization-table';
import { DonationFilterBar } from './components/filter-bar/filter-bar';
import { DonorFilterBar } from './components/donor-filter-bar/donor-filter-bar';
import { FundraiserFilterBar } from './components/fundraiser-filter-bar/fundraiser-filter-bar';
import { CampaignFilterBar } from './components/campaign-filter-bar/campaign-filter-bar';
import { OrganizationFilterBar } from './components/organization-filter-bar/organization-filter-bar';
import { Pagination } from './components/pagination/pagination';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';
import { Dropdown } from '../../shared/components/dropdown/dropdown';
import type { SortParams, FilterParams, DonorFilterParams, FundraiserFilterParams, CampaignFilterParams, OrganizationFilterParams } from '@formunauts/shared';

export type QueryTab = 'donations' | 'donors' | 'fundraisers' | 'campaigns' | 'organizations';


@Component({
  selector: 'app-query',
  imports: [
    DonationTable, DonorTable, FundraiserTable, CampaignTable, OrganizationTable,
    DonationFilterBar, DonorFilterBar, FundraiserFilterBar, CampaignFilterBar, OrganizationFilterBar,
    Pagination,
    LoadingSpinner, ErrorBanner, Dropdown, NgIcon, TranslocoPipe,
  ],
  templateUrl: './query.html',
  styleUrl: './query.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Query {
  readonly #donationService     = inject(DonationService);
  readonly #campaignService     = inject(CampaignService);
  readonly #donorService        = inject(DonorService);
  readonly #fundraiserService   = inject(FundraiserService);
  readonly #organizationService = inject(OrganizationService);
  readonly #lang                = inject(LanguageService);
  readonly #transloco           = inject(TranslocoService);

  // ── Tab state ─────────────────────────────────────────────────────────────

  readonly QUERY_TABS = computed(() => {
    this.#lang.lang();
    const t = (k: string) => this.#transloco.translate(k);
    return [
      { value: 'donations' as QueryTab,     label: t('query.tabs.donations') },
      { value: 'donors' as QueryTab,        label: t('query.tabs.donors') },
      { value: 'fundraisers' as QueryTab,   label: t('query.tabs.fundraisers') },
      { value: 'campaigns' as QueryTab,     label: t('query.tabs.campaigns') },
      { value: 'organizations' as QueryTab, label: t('query.tabs.organizations') },
    ];
  });
  readonly activeTab = signal<QueryTab>('donations');
  readonly isDonationsTab = computed(() => this.activeTab() === 'donations');

  selectTab(tab: QueryTab): void { this.activeTab.set(tab); }

  // ── Donations tab ─────────────────────────────────────────────────────────

  readonly donations    = this.#donationService.donations;
  readonly liveEnabled  = this.#donationService.liveEnabled;
  readonly pagination   = this.#donationService.pagination;
  readonly isLoading    = this.#donationService.isLoading;
  readonly error        = this.#donationService.error;
  readonly sortParams   = this.#donationService.sortParams;
  readonly viewMode     = this.#donationService.viewMode;
  readonly hasMore      = this.#donationService.hasMore;
  readonly limit        = this.#donationService.limit;
  readonly filterParams = this.#donationService.filterParams;

  readonly scrollSentinel = viewChild<ElementRef<HTMLElement>>('scrollSentinel');

  readonly rowsOptions = computed(() => [
    { value: '10',  label: '10 rows' },
    { value: '25',  label: '25 rows' },
    { value: '50',  label: '50 rows' },
    { value: '100', label: '100 rows' },
    { value: '0',   label: '∞ (all)' },
  ]);

  readonly currentRowsValue = computed(() =>
    this.viewMode() === 'infinite' ? '0' : String(this.limit()),
  );

  readonly pageOptions = computed(() => {
    const p = this.pagination();
    if (!p) return [];
    return Array.from({ length: p.totalPages }, (_, i) => ({
      value: String(i + 1),
      label: `Page ${i + 1}`,
    }));
  });

  readonly currentPageValue = computed(() => {
    const p = this.pagination();
    return p ? String(p.page) : '1';
  });

  readonly rangeStart = computed(() => {
    const p = this.pagination();
    return p ? (p.page - 1) * this.limit() + 1 : 0;
  });

  readonly rangeEnd = computed(() => {
    const p = this.pagination();
    return p ? (this.limit() === 0 ? p.total : Math.min(p.page * this.limit(), p.total)) : 0;
  });

  // ── Donors tab ────────────────────────────────────────────────────────────

  readonly donors          = computed(() => this.#donorService.donors.value()?.data ?? []);
  readonly donorPagination = computed(() => this.#donorService.donors.value()?.pagination ?? null);
  readonly donorsLoading   = this.#donorService.donors.isLoading;
  readonly donorsError     = this.#donorService.donors.error;
  readonly donorFilter     = signal<DonorFilterParams>({});

  // ── Fundraisers tab ───────────────────────────────────────────────────────

  readonly fundraisers        = computed(() => this.#fundraiserService.fundraisers.value()?.data ?? []);
  readonly fundraisersLoading = this.#fundraiserService.fundraisers.isLoading;
  readonly fundraisersError   = this.#fundraiserService.fundraisers.error;
  readonly fundraiserFilter   = signal<FundraiserFilterParams>({});

  // ── Campaigns tab ─────────────────────────────────────────────────────────

  readonly #allCampaigns    = computed(() => this.#campaignService.campaigns.value() ?? []);
  readonly campaignsLoading = this.#campaignService.campaigns.isLoading;
  readonly campaignsError   = this.#campaignService.campaigns.error;
  readonly campaignFilter   = signal<CampaignFilterParams>({});

  readonly campaigns = computed(() => {
    const f = this.campaignFilter();
    return this.#allCampaigns().filter(c => {
      if (f.search && !c.name.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.status && c.status !== f.status) return false;
      return true;
    });
  });

  // ── Organizations tab ─────────────────────────────────────────────────────

  readonly #allOrganizations    = computed(() => this.#organizationService.organizations.value() ?? []);
  readonly organizationsLoading = this.#organizationService.organizations.isLoading;
  readonly organizationsError   = this.#organizationService.organizations.error;
  readonly organizationFilter   = signal<OrganizationFilterParams>({});

  readonly organizations = computed(() => {
    const f = this.organizationFilter();
    return this.#allOrganizations().filter(o => {
      if (f.search && !o.name.toLowerCase().includes(f.search.toLowerCase())) return false;
      if (f.type && o.type !== f.type) return false;
      return true;
    });
  });

  constructor() {
    effect((onCleanup) => {
      const sentinel = this.scrollSentinel();
      if (!sentinel) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this.#donationService.loadMore();
          }
        },
        { threshold: 0.1 }
      );

      observer.observe(sentinel.nativeElement);
      onCleanup(() => observer.disconnect());
    });
  }

  toggleLive(): void {
    this.#donationService.toggleLive();
  }

  onFilterChange(params: FilterParams): void {
    this.#donationService.setFilter(params);
  }

  onViewModeChange(mode: ViewMode): void {
    this.#donationService.setViewMode(mode);
  }

  onSortChange(params: SortParams): void {
    this.#donationService.setSort(params);
  }

  onPageChange(page: number): void {
    this.#donationService.setPage(page);
  }

  onLimitChange(limit: number): void {
    this.#donationService.setLimit(limit);
  }

  onDonorPageChange(page: number): void {
    this.#donorService.setPage(page);
  }

  onDonorFilterChange(params: DonorFilterParams): void {
    this.donorFilter.set(params);
    this.#donorService.setSearch(params.search ?? '');
    this.#donorService.setCountry(params.country ?? '');
  }

  onFundraiserFilterChange(params: FundraiserFilterParams): void {
    this.fundraiserFilter.set(params);
    this.#fundraiserService.setSearch(params.search ?? '');
    this.#fundraiserService.setIsActive(params.isActive ?? null);
  }

  onCampaignFilterChange(params: CampaignFilterParams): void {
    this.campaignFilter.set(params);
  }

  onOrganizationFilterChange(params: OrganizationFilterParams): void {
    this.organizationFilter.set(params);
  }

  // ── Donation pagination handlers ──────────────────────────────────────────

  go(page: number): void {
    const p = this.pagination();
    if (!p || page < 1 || page > p.totalPages) return;
    this.onPageChange(page);
  }

  onPageDropdownChange(value: string): void {
    this.go(Number(value));
  }

  onRowsDropdownChange(value: string): void {
    const opt = Number(value);
    if (opt === 0) {
      this.onViewModeChange('infinite');
    } else {
      if (this.viewMode() === 'infinite') this.onViewModeChange('pagination');
      this.onLimitChange(opt);
    }
  }
}
