import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DonationService } from '../../core/services/donation';
import type { ViewMode } from '../../core/services/donation';
import { CampaignService } from '../../core/services/campaign';
import { DonationTable } from './components/donation-table/donation-table';
import { DonationFilterBar } from './components/filter-bar/filter-bar';
import { DonationForm } from '../donation-form/donation-form';
import { BulkDonationUpload } from '../donation-form/bulk-donation-upload/bulk-donation-upload';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';
import type { SortParams, CreateDonationRequest, FilterParams } from '@formunauts/shared';

@Component({
  selector: 'app-donations',
  imports: [DonationTable, DonationFilterBar, DonationForm, BulkDonationUpload, LoadingSpinner, ErrorBanner],
  templateUrl: './donations.html',
  styleUrl: './donations.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Donations {
  readonly #donationService = inject(DonationService);
  readonly #campaignService = inject(CampaignService);
  readonly activeCampaignId = computed(() => this.#campaignService.campaignResource.value()?.id);

  readonly donations = this.#donationService.donations;
  readonly pagination = this.#donationService.pagination;
  readonly isLoading = this.#donationService.isLoading;
  readonly error = this.#donationService.error;
  readonly sortParams = this.#donationService.sortParams;
  readonly viewMode = this.#donationService.viewMode;
  readonly hasMore = this.#donationService.hasMore;
  readonly limit = this.#donationService.limit;
  readonly filterParams = this.#donationService.filterParams;

  readonly donationFormRef = viewChild(DonationForm);
  readonly sidebarMode = signal<'single' | 'bulk'>('single');
  readonly scrollSentinel = viewChild<ElementRef<HTMLElement>>('scrollSentinel');

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

  setSidebarMode(mode: 'single' | 'bulk'): void {
    this.sidebarMode.set(mode);
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

  onDonationSubmitted(req: CreateDonationRequest): void {
    this.#donationService.submit(req).subscribe({
      next: () => this.donationFormRef()?.onSuccess(),
      error: (err: Error) => this.donationFormRef()?.onError(err.message),
    });
  }
}
