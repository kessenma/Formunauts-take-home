import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import type { Donation, CreateDonationRequest, PaginatedResponse, SortParams, FilterParams } from '@formunauts/shared';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export type ViewMode = 'pagination' | 'infinite';

@Injectable({ providedIn: 'root' })
export class DonationService {
  readonly #http = inject(HttpClient);

  readonly page = signal(1);
  readonly limit = signal(10);
  readonly sortParams = signal<SortParams>({ sort: 'date', order: 'desc' } satisfies SortParams);
  readonly filterParams = signal<FilterParams>({});
  readonly viewMode = signal<ViewMode>('pagination');

  readonly donationsResource = httpResource<PaginatedResponse<Donation>>(() => {
    const { sort, order } = this.sortParams();
    const filter = this.filterParams();
    const params = new URLSearchParams({
      page: String(this.page()),
      limit: String(this.limit()),
      sort,
      order,
    });
    if (filter.search)            params.set('search', filter.search);
    if (filter.paymentMethod)     params.set('paymentMethod', filter.paymentMethod);
    if (filter.channel)           params.set('channel', filter.channel);
    if (filter.minAmount != null) params.set('minAmount', String(filter.minAmount));
    if (filter.maxAmount != null) params.set('maxAmount', String(filter.maxAmount));
    if (filter.dateFrom)          params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo)            params.set('dateTo', filter.dateTo);
    return `/api/donations?${params}`;
  });

  readonly liveEnabled = signal(true);
  readonly #wsInserted = signal<Donation[]>([]);
  readonly #accumulated = signal<Donation[]>([]);
  readonly #lastAccumulatedPage = signal(0);

  constructor() {
    effect(() => {
      const value = this.donationsResource.value();
      const loading = this.donationsResource.isLoading();
      const mode = this.viewMode();

      if (!loading && value && mode === 'infinite') {
        const lastPage = untracked(() => this.#lastAccumulatedPage());
        if (value.page !== lastPage) {
          this.#lastAccumulatedPage.set(value.page);
          this.#accumulated.update((prev) => [...prev, ...value.data]);
        }
      }
    });
  }

  readonly donations = computed(() => {
    const ws = this.#wsInserted();
    if (this.viewMode() === 'infinite') {
      return [...ws, ...this.#accumulated()];
    }
    return [...ws, ...(this.donationsResource.value()?.data ?? [])];
  });

  readonly pagination = computed(() => this.donationsResource.value());
  readonly isLoading = computed(() => this.donationsResource.isLoading());
  readonly error = computed(() => this.donationsResource.error());
  readonly hasMore = computed(() => {
    const p = this.donationsResource.value();
    return p ? this.page() < p.totalPages : false;
  });

  prependDonation(donation: Donation): void {
    if (!this.liveEnabled()) return;
    this.#wsInserted.update((prev) => [donation, ...prev]);
  }

  toggleLive(): void {
    this.liveEnabled.update(v => !v);
  }

  submit(req: CreateDonationRequest): Observable<Donation> {
    return this.#http.post<Donation>('/api/donations', req).pipe(
      tap((donation) => this.prependDonation(donation))
    );
  }

  setPage(page: number): void {
    this.#wsInserted.set([]);
    this.page.set(page);
  }

  setLimit(limit: number): void {
    this.#wsInserted.set([]);
    this.limit.set(limit);
    this.page.set(1);
  }

  setSort(params: SortParams): void {
    this.#wsInserted.set([]);
    this.#accumulated.set([]);
    this.#lastAccumulatedPage.set(0);
    this.sortParams.set(params);
    this.page.set(1);
  }

  setFilter(params: FilterParams): void {
    this.#wsInserted.set([]);
    this.#accumulated.set([]);
    this.#lastAccumulatedPage.set(0);
    this.filterParams.set(params);
    this.page.set(1);
  }

  setViewMode(mode: ViewMode): void {
    this.#accumulated.set([]);
    this.#lastAccumulatedPage.set(0);
    this.#wsInserted.set([]);
    this.page.set(1);
    this.viewMode.set(mode);
  }

  loadMore(): void {
    const p = this.donationsResource.value();
    if (p && this.page() < p.totalPages && !this.donationsResource.isLoading()) {
      this.page.update((n) => n + 1);
    }
  }
}
