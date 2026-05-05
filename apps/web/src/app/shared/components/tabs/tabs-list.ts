import { ChangeDetectionStrategy, Component, ViewEncapsulation, inject } from '@angular/core';
import { TABS_TOKEN } from './tabs-token';

@Component({
  selector: 'app-tabs-list',
  imports: [],
  templateUrl: './tabs-list.html',
  styleUrl: './tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TabsList {
  protected readonly ctx = inject(TABS_TOKEN);
}
