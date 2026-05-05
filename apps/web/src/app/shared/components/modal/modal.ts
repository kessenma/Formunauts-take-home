import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewEncapsulation,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-modal',
  imports: [NgIcon],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Required so ::backdrop pseudo-element is not broken by Angular's attribute scoping
  encapsulation: ViewEncapsulation.None,
})
export class Modal {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly showFooter = input<boolean>(false);
  readonly closed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogEl');

  constructor() {
    effect(() => {
      const el = this.dialogRef()?.nativeElement;
      if (!el) return;
      if (this.open()) {
        el.showModal();
      } else if (el.open) {
        el.close();
      }
    });
  }

  onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }
}
