import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { CampaignService } from '../../core/services/campaign';
import { FundraiserService } from '../../core/services/fundraiser';
import { CampaignCard } from './components/campaign-card/campaign-card';
import { DonationsChart } from './components/donations-chart/donations-chart';
import { ChannelChart } from './components/channel-chart/channel-chart';
import { PaymentMethodChart } from './components/payment-method-chart/payment-method-chart';
import { FundraiserLeaderboard } from './components/fundraiser-leaderboard/fundraiser-leaderboard';
import { CampaignSelector } from './components/campaign-selector/campaign-selector';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';
import type { DonationChartData } from '@formunauts/shared';

@Component({
  selector: 'app-dashboard',
  imports: [
    CampaignCard, DonationsChart, ChannelChart, PaymentMethodChart,
    FundraiserLeaderboard, CampaignSelector,
    LoadingSpinner, ErrorBanner,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly #campaignService = inject(CampaignService);
  readonly #fundraiserService = inject(FundraiserService);

  readonly campaigns = this.#campaignService.campaigns;
  readonly selectedCampaign = this.#campaignService.selectedCampaign;
  readonly selectedId = this.#campaignService.selectedCampaignId;

  readonly chartData = httpResource<DonationChartData>(() => {
    const id = this.selectedId();
    return id ? `/api/donations/chart?campaignId=${id}` : undefined;
  });

  readonly topFundraisers = computed(() =>
    (this.#fundraiserService.fundraisers.value()?.data ?? []).slice(0, 5),
  );

  onCampaignSelect(id: number): void {
    this.#campaignService.selectCampaign(id);
    this.#fundraiserService.campaignFilter.set(id);
  }
}
