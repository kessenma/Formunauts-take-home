import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import type { FundraiserStats } from '@formunauts/shared';

@Component({
  selector: 'app-fundraiser-leaderboard',
  imports: [CurrencyPipe],
  templateUrl: './fundraiser-leaderboard.html',
  styleUrl: './fundraiser-leaderboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundraiserLeaderboard {
  readonly fundraisers = input<FundraiserStats[]>([]);
}
