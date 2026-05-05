import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { ChatService } from '../../../core/services/chat';
import { LanguageService } from '../../../core/services/language';
import { ThemeService } from '../../../core/services/theme';
import { Avatar } from '../avatar/avatar';
import { Sheet } from '../sheet/sheet';
import type { ChatSession } from '@formunauts/shared';

const PAGE_KEY_MAP: Record<string, string> = {
  '':              'nav.links.dashboard',
  'query':         'nav.links.query',
  'conversations': 'nav.links.conversations',
  'settings':      'nav.links.settings',
};

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive, NgIcon, Avatar, Sheet, TranslocoPipe],
  templateUrl: './nav.html',
  styleUrl: './nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNav {
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly chatService = inject(ChatService);
  readonly lang = inject(LanguageService);
  readonly #transloco = inject(TranslocoService);
  readonly #router = inject(Router);

  readonly profileSheetOpen = signal(false);
  readonly menuOpen = signal(false);
  readonly logoPulsing = signal(false);

  readonly #url = toSignal(
    this.#router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => e.urlAfterRedirects),
      startWith(this.#router.url),
    ),
    { initialValue: this.#router.url },
  );

  readonly pageName = computed(() => {
    const segment = (this.#url() ?? '/').split('?')[0].split('/')[1] ?? '';
    this.lang.lang(); // signal dependency — re-evaluates on language change
    const key = PAGE_KEY_MAP[segment];
    return key ? this.#transloco.translate(key) : null;
  });
  readonly animating = signal(false);
  readonly launchingFromDark = signal(false);

  readonly smokeCircles: ReadonlyArray<{ bottom: string; delay: string }> = [
    { bottom: '8vh',  delay: '0.40s' },
    { bottom: '22vh', delay: '0.72s' },
    { bottom: '36vh', delay: '0.92s' },
    { bottom: '50vh', delay: '1.08s' },
    { bottom: '64vh', delay: '1.22s' },
    { bottom: '78vh', delay: '1.35s' },
  ];

  // Cloud puffs that sweep from bottom to top following the wipe line.
  // 6 rows × 5 columns = 30 circles covering the full viewport width.
  // Delays: t = sqrt((Y + 30) / 145) * 1800ms  (ease-in from -30% to 115%).
  // Sizes and bottom offsets are varied slightly per circle for organic look.
  readonly wipeBubbles: ReadonlyArray<{
    bottom: string; delay: string; left: string; size: number;
  }> = [
    // Row 1 — ~0 vh (base delay 0.82s)
    { bottom: '0vh',  delay: '0.82s', left: '10%', size: 130 },
    { bottom: '1vh',  delay: '0.85s', left: '28%', size: 150 },
    { bottom: '0vh',  delay: '0.88s', left: '50%', size: 140 },
    { bottom: '1vh',  delay: '0.91s', left: '72%', size: 155 },
    { bottom: '0vh',  delay: '0.94s', left: '90%', size: 130 },
    // Row 2 — ~15 vh (base delay 1.00s)
    { bottom: '15vh', delay: '1.00s', left: '10%', size: 145 },
    { bottom: '16vh', delay: '1.03s', left: '28%', size: 125 },
    { bottom: '15vh', delay: '1.06s', left: '50%', size: 160 },
    { bottom: '16vh', delay: '1.09s', left: '72%', size: 140 },
    { bottom: '15vh', delay: '1.12s', left: '90%', size: 150 },
    // Row 3 — ~30 vh (base delay 1.16s)
    { bottom: '30vh', delay: '1.16s', left: '10%', size: 135 },
    { bottom: '29vh', delay: '1.19s', left: '28%', size: 160 },
    { bottom: '31vh', delay: '1.22s', left: '50%', size: 145 },
    { bottom: '30vh', delay: '1.25s', left: '72%', size: 155 },
    { bottom: '29vh', delay: '1.28s', left: '90%', size: 130 },
    // Row 4 — ~45 vh (base delay 1.29s)
    { bottom: '45vh', delay: '1.29s', left: '10%', size: 150 },
    { bottom: '46vh', delay: '1.32s', left: '28%', size: 135 },
    { bottom: '45vh', delay: '1.35s', left: '50%', size: 165 },
    { bottom: '46vh', delay: '1.38s', left: '72%', size: 140 },
    { bottom: '45vh', delay: '1.41s', left: '90%', size: 150 },
    // Row 5 — ~60 vh (base delay 1.42s)
    { bottom: '60vh', delay: '1.42s', left: '10%', size: 145 },
    { bottom: '59vh', delay: '1.45s', left: '28%', size: 155 },
    { bottom: '61vh', delay: '1.48s', left: '50%', size: 135 },
    { bottom: '59vh', delay: '1.51s', left: '72%', size: 160 },
    { bottom: '60vh', delay: '1.54s', left: '90%', size: 140 },
    // Row 6 — ~75 vh (base delay 1.53s)
    { bottom: '75vh', delay: '1.53s', left: '10%', size: 155 },
    { bottom: '76vh', delay: '1.56s', left: '28%', size: 140 },
    { bottom: '75vh', delay: '1.59s', left: '50%', size: 165 },
    { bottom: '76vh', delay: '1.62s', left: '72%', size: 145 },
    { bottom: '75vh', delay: '1.65s', left: '90%', size: 150 },
  ];

  constructor() {
    effect(() => {
      if (this.profileSheetOpen()) this.chatService.loadMySessions();
    });
  }

  openChatSession(session: ChatSession): void {
    this.chatService.openWithSession(session);
    this.profileSheetOpen.set(false);
  }

  newChat(): void {
    this.chatService.newSession();
    this.profileSheetOpen.set(false);
  }

  onLogoClick(): void {
    this.logoPulsing.set(true);
    setTimeout(() => this.logoPulsing.set(false), 500);
  }

  triggerThemeAnimation(): void {
    if (this.animating()) return;
    this.launchingFromDark.set(this.theme.isDark());
    this.animating.set(true);
    // Toggle at 1700ms — wipe covers ~100% by then, so the CSS variable flip is hidden
    setTimeout(() => this.theme.toggle(), 1700);
    // Remove overlay after fade-out (1800ms wipe + 300ms fade)
    setTimeout(() => this.animating.set(false), 2100);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.#router.navigate(['/login']);
  }
}
