import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import type { CampaignSummary } from '@formunauts/shared';

@Component({
  selector: 'app-campaign-selector',
  imports: [CurrencyPipe],
  templateUrl: './campaign-selector.html',
  styleUrl: './campaign-selector.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignSelector {
  readonly campaigns = input<CampaignSummary[]>([]);
  readonly selectedId = input<number | null>(null);
  readonly select = output<number>();

  progressPct(c: CampaignSummary): number {
    return Math.min(100, Math.round((c.totalRaised / c.goal) * 100));
  }
}
