import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { FundraiserStats } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class FundraiserService {
  readonly campaignFilter = signal<number | null>(null);

  readonly fundraisers = httpResource<{ data: FundraiserStats[]; total: number }>(() => {
    const cid = this.campaignFilter();
    return cid ? `/api/fundraisers?campaignId=${cid}` : '/api/fundraisers';
  });
}
