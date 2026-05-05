import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { DonorService } from '../../core/services/donor';
import { Pagination } from '../query/components/pagination/pagination';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';

@Component({
  selector: 'app-donors',
  imports: [CurrencyPipe, DatePipe, Pagination, LoadingSpinner, ErrorBanner, TranslocoPipe],
  templateUrl: './donors.html',
  styleUrl: './donors.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Donors {
  readonly #service = inject(DonorService);

  readonly donors = computed(() => this.#service.donors.value()?.data ?? []);
  readonly pagination = computed(() => this.#service.donors.value()?.pagination ?? null);
  readonly isLoading = this.#service.donors.isLoading;
  readonly error = this.#service.donors.error;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.#service.setSearch(term), 300);
  }

  onPageChange(p: number): void { this.#service.setPage(p); }
}
