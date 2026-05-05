import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { DonorSummary, PaginatedResponse } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class DonorService {
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly search = signal('');
  readonly campaignFilter = signal<number | null>(null);

  readonly donors = httpResource<PaginatedResponse<DonorSummary>>(() => {
    const params = new URLSearchParams({
      page: String(this.page()),
      limit: String(this.limit()),
    });
    if (this.search()) params.set('search', this.search());
    const cid = this.campaignFilter();
    if (cid) params.set('campaignId', String(cid));
    return `/api/donors?${params}`;
  });

  setPage(p: number): void { this.page.set(p); }
  setSearch(s: string): void { this.search.set(s); this.page.set(1); }
}
