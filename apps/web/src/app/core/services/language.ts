import { effect, inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';

export type Lang = 'en' | 'de';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly #doc = inject(DOCUMENT);
  readonly #transloco = inject(TranslocoService);

  readonly lang = signal<Lang>(this.#resolveInitial());

  constructor() {
    effect(() => {
      const l = this.lang();
      this.#transloco.setActiveLang(l);
      this.#doc.documentElement.setAttribute('lang', l);
      localStorage.setItem('lang', l);
    });
  }

  toggle(): void {
    this.lang.update(l => l === 'en' ? 'de' : 'en');
  }

  #resolveInitial(): Lang {
    const stored = localStorage.getItem('lang');
    if (stored === 'en' || stored === 'de') return stored;
    return navigator.language.startsWith('de') ? 'de' : 'en';
  }
}
