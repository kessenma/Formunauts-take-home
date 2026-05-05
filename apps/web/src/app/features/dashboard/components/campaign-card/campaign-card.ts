import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe, CurrencyPipe } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import type { Campaign } from '@formunauts/shared';

@Component({
  selector: 'app-campaign-card',
  imports: [DecimalPipe, CurrencyPipe, NgIcon],
  templateUrl: './campaign-card.html',
  styleUrl: './campaign-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignCard {
  readonly campaign = input.required<Campaign>();

  readonly progressPct = computed(() => {
    const c = this.campaign();
    return Math.min(100, Math.round((c.totalRaised / c.goal) * 100));
  });
}
