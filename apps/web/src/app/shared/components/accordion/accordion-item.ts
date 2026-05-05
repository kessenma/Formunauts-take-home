import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  effect,
  input,
  output,
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
  readonly initiallyOpen = input<boolean>(false);
  readonly toggled = output<boolean>();
  readonly isOpen = signal(false);
  readonly panelId = `accordion-panel-${nextId++}`;

  constructor() {
    effect(() => { if (this.initiallyOpen()) this.isOpen.set(true); });
  }

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    this.toggled.emit(next);
  }
}
