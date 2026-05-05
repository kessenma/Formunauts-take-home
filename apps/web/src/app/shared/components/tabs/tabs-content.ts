import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
} from '@angular/core';
import { TABS_TOKEN } from './tabs-token';

@Component({
  selector: 'app-tabs-content',
  imports: [],
  templateUrl: './tabs-content.html',
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TabsContent {
  readonly value = input.required<string>();

  private readonly ctx = inject(TABS_TOKEN);
  protected readonly isActive = computed(() => this.ctx.activeTab() === this.value());
}
