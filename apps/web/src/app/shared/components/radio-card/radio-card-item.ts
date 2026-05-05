import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { RADIO_CARD_TOKEN } from './radio-card-token';

@Component({
  selector: 'app-radio-card-item',
  imports: [NgIcon],
  templateUrl: './radio-card-item.html',
  styleUrl: './radio-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class RadioCardItem {
  readonly value = input.required<string>();
  readonly disabled = input<boolean>(false);

  private readonly ctx = inject(RADIO_CARD_TOKEN, { optional: true });

  protected readonly isSelected = computed(() => this.ctx?.value() === this.value());

  protected select(): void {
    if (!this.disabled()) {
      this.ctx?.select(this.value());
    }
  }
}
