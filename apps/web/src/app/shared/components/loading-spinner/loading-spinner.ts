import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  template: `<div class="spinner" [style.width.px]="size()" [style.height.px]="size()" aria-label="Loading" role="status"></div>`,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--spacing-32, 32px);
    }
    .spinner {
      border: 3px solid var(--border-color, rgba(0,0,0,0.12));
      border-top-color: var(--color-lochmara, #0074C8);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinner {
  readonly size = input(36);
}
