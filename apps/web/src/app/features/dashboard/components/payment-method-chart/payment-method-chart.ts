import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe, PercentPipe, TitleCasePipe } from '@angular/common';
import type { ChartBreakdownItem } from '@formunauts/shared';

@Component({
  selector: 'app-payment-method-chart',
  imports: [CurrencyPipe, PercentPipe, TitleCasePipe],
  templateUrl: './payment-method-chart.html',
  styleUrl: './payment-method-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentMethodChart {
  readonly items = input<ChartBreakdownItem[]>([]);

  readonly grandTotal = computed(() => this.items().reduce((s, i) => s + i.value, 0));
}
