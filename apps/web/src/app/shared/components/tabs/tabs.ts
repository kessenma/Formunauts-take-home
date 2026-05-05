import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { TABS_TOKEN, TabsContext, TabsVariant } from './tabs-token';

@Component({
  selector: 'app-tabs',
  imports: [],
  template: `<div class="tabs"><ng-content /></div>`,
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: TABS_TOKEN,
      useExisting: forwardRef(() => Tabs),
    },
  ],
})
export class Tabs implements TabsContext {
  readonly value = input<string>('');
  readonly variant = input<TabsVariant>('default');
  readonly tabChange = output<string>();

  readonly activeTab = signal('');

  constructor() {
    effect(() => {
      const v = this.value();
      if (v) this.activeTab.set(v);
    });
  }

  select(value: string): void {
    this.activeTab.set(value);
    this.tabChange.emit(value);
  }
}
