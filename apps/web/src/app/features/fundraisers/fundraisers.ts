import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { FundraiserService } from '../../core/services/fundraiser';
import { CampaignService } from '../../core/services/campaign';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { ErrorBanner } from '../../shared/components/error-banner/error-banner';

@Component({
  selector: 'app-fundraisers',
  imports: [CurrencyPipe, LoadingSpinner, ErrorBanner, TranslocoPipe],
  templateUrl: './fundraisers.html',
  styleUrl: './fundraisers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Fundraisers {
  readonly #service = inject(FundraiserService);
  readonly #campaignService = inject(CampaignService);

  readonly campaigns = this.#campaignService.campaigns;
  readonly fundraisers = computed(() => this.#service.fundraisers.value()?.data ?? []);
  readonly isLoading = this.#service.fundraisers.isLoading;
  readonly error = this.#service.fundraisers.error;

  onCampaignFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.#service.campaignFilter.set(value ? parseInt(value) : null);
  }
}
