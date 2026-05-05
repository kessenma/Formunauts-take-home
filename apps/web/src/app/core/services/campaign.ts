import { Injectable, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import type { CampaignSummary } from '@formunauts/shared';

@Injectable({ providedIn: 'root' })
export class CampaignService {
  readonly campaigns = httpResource<CampaignSummary[]>(() => '/api/campaigns');

  readonly #selectedId = signal<number | null>(null);

  readonly selectedCampaignId = computed(() =>
    this.#selectedId() ?? this.campaigns.value()?.[0]?.id ?? null,
  );

  readonly selectedCampaign = computed(() =>
    this.campaigns.value()?.find(c => c.id === this.selectedCampaignId()) ?? null,
  );

  // Compat alias — keeps DonationForm + Donations page working without changes
  readonly campaignResource = {
    value: this.selectedCampaign,
    isLoading: this.campaigns.isLoading,
    error: this.campaigns.error,
  };

  selectCampaign(id: number): void {
    this.#selectedId.set(id);
  }
}
