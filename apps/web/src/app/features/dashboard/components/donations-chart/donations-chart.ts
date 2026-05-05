import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

interface ChartBar {
  date: string;
  total: number;
  height: number;
}

@Component({
  selector: 'app-donations-chart',
  imports: [CurrencyPipe],
  templateUrl: './donations-chart.html',
  styleUrl: './donations-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationsChart {
  readonly bars = input<{ date: string; total: number }[]>([]);

  readonly chartBars = computed((): ChartBar[] => {
    const data = this.bars();
    if (!data.length) return [];
    const maxTotal = Math.max(...data.map(b => b.total));
    return data.slice(-30).map(b => ({
      date: b.date,
      total: b.total,
      height: maxTotal > 0 ? Math.round((b.total / maxTotal) * 100) : 0,
    }));
  });
}
