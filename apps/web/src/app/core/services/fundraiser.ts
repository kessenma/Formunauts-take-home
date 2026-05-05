import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { FundraiserStats } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class FundraiserService {
  readonly campaignFilter = signal<number | null>(null);
  readonly search = signal('');
  readonly isActive = signal<boolean | null>(null);

  readonly fundraisers = httpResource<{ data: FundraiserStats[]; total: number }>(() => {
    const params = new URLSearchParams();
    const cid = this.campaignFilter();
    if (cid) params.set('campaignId', String(cid));
    if (this.search()) params.set('search', this.search());
    const active = this.isActive();
    if (active !== null) params.set('isActive', String(active));
    const qs = params.toString();
    return qs ? `/api/fundraisers?${qs}` : '/api/fundraisers';
  });

  setSearch(s: string): void { this.search.set(s); }
  setIsActive(v: boolean | null): void { this.isActive.set(v); }
}
