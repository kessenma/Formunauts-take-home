import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe, PercentPipe, TitleCasePipe } from '@angular/common';
import type { ChartBreakdownItem } from '@formunauts/shared';

@Component({
  selector: 'app-channel-chart',
  imports: [CurrencyPipe, PercentPipe, TitleCasePipe],
  templateUrl: './channel-chart.html',
  styleUrl: './channel-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelChart {
  readonly items = input<ChartBreakdownItem[]>([]);

  readonly grandTotal = computed(() => this.items().reduce((s, i) => s + i.value, 0));
}
