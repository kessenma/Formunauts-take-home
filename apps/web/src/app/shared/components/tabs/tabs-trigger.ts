import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TABS_TOKEN } from './tabs-token';

@Component({
  selector: 'app-tabs-trigger',
  imports: [NgIcon],
  templateUrl: './tabs-trigger.html',
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TabsTrigger {
  readonly value = input.required<string>();
  readonly disabled = input<boolean>(false);
  readonly showCheckmark = input<boolean>(false);

  protected readonly ctx = inject(TABS_TOKEN);
  protected readonly isActive = computed(() => this.ctx.activeTab() === this.value());
  protected readonly isStyled = computed(() => this.ctx.variant() === 'styled');

  protected select(): void {
    if (!this.disabled()) {
      this.ctx.select(this.value());
    }
  }
}
