import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.html',
  styleUrl: './avatar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly src = input<string | null>(null);
  readonly name = input<string>('');
  readonly size = input<number>(36);
  readonly maxInitials = input<number>(2);

  readonly initials = computed(() => {
    const name = this.name().trim();
    if (!name) return '';
    return name
      .split(/\s+/)
      .slice(0, this.maxInitials())
      .map(p => p.charAt(0).toUpperCase())
      .join('');
  });

  readonly classes = computed(() => {
    const colorIdx = this.name().trim() ? this.name().charCodeAt(0) % 6 : 0;
    return `avatar avatar--color-${colorIdx}`;
  });
}
