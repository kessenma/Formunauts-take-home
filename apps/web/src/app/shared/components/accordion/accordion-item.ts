import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  signal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

let nextId = 0;

@Component({
  selector: 'app-accordion-item',
  imports: [NgIcon],
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AccordionItem {
  readonly title = input.required<string>();
  readonly isOpen = signal(false);
  readonly panelId = `accordion-panel-${nextId++}`;

  toggle(): void {
    this.isOpen.update(v => !v);
  }
}
