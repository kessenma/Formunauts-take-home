import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-error-banner',
  template: `
    @if (message()) {
      <div class="error-banner" role="alert">
        <strong>Error:</strong> {{ message() }}
      </div>
    }
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-12, 12px);
      background: var(--color-error-bg, #f8d7da);
      color: var(--color-error-text, #842029);
      border-radius: var(--radius-general, 5px);
      padding: var(--spacing-12, 12px) var(--spacing-16, 16px);
      font-size: var(--text-body-sm, 14px);
      margin-bottom: var(--spacing-16, 16px);
    }
    strong { flex-shrink: 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBanner {
  readonly message = input<string | null>(null);
}
