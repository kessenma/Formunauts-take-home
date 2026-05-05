import { InjectionToken, Signal } from '@angular/core';

export interface RadioCardContext {
  readonly value: Signal<string>;
  select(value: string): void;
}

export const RADIO_CARD_TOKEN = new InjectionToken<RadioCardContext>('RadioCardContext');
