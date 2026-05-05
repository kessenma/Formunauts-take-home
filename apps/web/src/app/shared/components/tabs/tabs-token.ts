import { InjectionToken, Signal } from '@angular/core';

export type TabsVariant = 'default' | 'underline' | 'pills' | 'styled';

export interface TabsContext {
  readonly activeTab: Signal<string>;
  readonly variant: Signal<TabsVariant>;
  select(value: string): void;
}

export const TABS_TOKEN = new InjectionToken<TabsContext>('TabsContext');
