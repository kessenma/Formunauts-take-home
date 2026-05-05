import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { FilterParams, PaymentMethod, DonationChannel } from '@formunauts/shared';
import type { ViewMode } from '../../../../core/services/donation';
import { LanguageService } from '../../../../core/services/language';
import { Dropdown } from '../../../../shared/components/dropdown/dropdown';

@Component({
  selector: 'app-donation-filter-bar',
  imports: [NgIcon, Dropdown, TranslocoPipe],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-sticky]': 'viewMode() === "infinite"' },
})
export class DonationFilterBar {
  readonly #lang = inject(LanguageService);
  readonly #transloco = inject(TranslocoService);

  readonly filter = input<FilterParams>({});
  readonly isLoading = input(false);
  readonly viewMode = input<ViewMode>('pagination');

  readonly filterChange = output<FilterParams>();
  readonly viewModeChange = output<ViewMode>();

  readonly PAYMENT_METHODS = computed<Array<{ value: PaymentMethod | ''; label: string }>>(() => {
    this.#lang.lang();
    const t = (k: string) => this.#transloco.translate(k);
    return [
      { value: '', label: t('paymentMethods.allMethods') },
      { value: 'sepa_direct_debit', label: t('paymentMethods.sepaDirectDebit') },
      { value: 'credit_card', label: t('paymentMethods.creditCard') },
      { value: 'google_pay', label: t('paymentMethods.googlePay') },
      { value: 'apple_pay', label: t('paymentMethods.applePay') },
      { value: 'paypal', label: t('paymentMethods.paypal') },
      { value: 'bank_transfer', label: t('paymentMethods.bankTransfer') },
      { value: 'cash', label: t('paymentMethods.cash') },
    ];
  });

  readonly CHANNELS = computed<Array<{ value: DonationChannel | ''; label: string }>>(() => {
    this.#lang.lang();
    const t = (k: string) => this.#transloco.translate(k);
    return [
      { value: '', label: t('channels.allChannels') },
      { value: 'street', label: t('channels.street') },
      { value: 'door_to_door', label: t('channels.doorToDoor') },
      { value: 'event', label: t('channels.event') },
      { value: 'phone', label: t('channels.phone') },
      { value: 'email', label: t('channels.email') },
      { value: 'social_media', label: t('channels.socialMedia') },
    ];
  });

  readonly filtersOpen = signal(false);

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.paymentMethod || f.channel || f.minAmount != null || f.maxAmount != null || f.dateFrom || f.dateTo);
  });

  readonly activeChips = computed(() => {
    const f = this.filter();
    const chips: Array<{ label: string; clear: () => void }> = [];

    if (f.search) {
      chips.push({ label: `"${f.search}"`, clear: () => this.clearField('search') });
    }
    if (f.paymentMethod) {
      chips.push({ label: this.getMethodLabel(f.paymentMethod), clear: () => this.clearField('paymentMethod') });
    }
    if (f.channel) {
      chips.push({ label: this.getChannelLabel(f.channel), clear: () => this.clearField('channel') });
    }
    if (f.minAmount != null || f.maxAmount != null) {
      const label =
        f.minAmount != null && f.maxAmount != null
          ? `$${f.minAmount} – $${f.maxAmount}`
          : f.minAmount != null
            ? `≥ $${f.minAmount}`
            : `≤ $${f.maxAmount!}`;
      chips.push({ label, clear: () => this.clearAmountFilter() });
    }
    if (f.dateFrom || f.dateTo) {
      const from = f.dateFrom ? this.formatDate(f.dateFrom) : null;
      const to = f.dateTo ? this.formatDate(f.dateTo) : null;
      const label =
        from && to ? `${from} – ${to}` : from ? `From ${from}` : `To ${to!}`;
      chips.push({ label, clear: () => this.clearDateFilter() });
    }

    return chips;
  });

  readonly activeFilterCount = computed(() => this.activeChips().length);

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  switchToPagination(): void {
    this.viewModeChange.emit('pagination');
  }

  private searchTimer?: ReturnType<typeof setTimeout>;

  onSearchInput(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filterChange.emit({ ...this.filter(), search: value.trim() || undefined });
    }, 300);
  }

  onPaymentMethodChange(value: string): void {
    this.filterChange.emit({
      ...this.filter(),
      paymentMethod: value ? (value as PaymentMethod) : undefined,
    });
  }

  onChannelChange(value: string): void {
    this.filterChange.emit({
      ...this.filter(),
      channel: value ? (value as DonationChannel) : undefined,
    });
  }

  onMinAmountChange(value: string): void {
    const num = parseFloat(value);
    this.filterChange.emit({ ...this.filter(), minAmount: value && !isNaN(num) ? num : undefined });
  }

  onMaxAmountChange(value: string): void {
    const num = parseFloat(value);
    this.filterChange.emit({ ...this.filter(), maxAmount: value && !isNaN(num) ? num : undefined });
  }

  onDateFromChange(value: string): void {
    this.filterChange.emit({ ...this.filter(), dateFrom: value || undefined });
  }

  onDateToChange(value: string): void {
    this.filterChange.emit({ ...this.filter(), dateTo: value || undefined });
  }

  clearFilters(): void {
    this.filterChange.emit({});
  }

  clearField(field: keyof FilterParams): void {
    const updated = { ...this.filter() };
    delete updated[field];
    this.filterChange.emit(updated);
  }

  clearAmountFilter(): void {
    const { minAmount: _a, maxAmount: _b, ...rest } = this.filter();
    this.filterChange.emit(rest);
  }

  clearDateFilter(): void {
    const { dateFrom: _a, dateTo: _b, ...rest } = this.filter();
    this.filterChange.emit(rest);
  }

  getMethodLabel(method: string): string {
    return this.PAYMENT_METHODS().find((m) => m.value === method)?.label ?? method;
  }

  getChannelLabel(channel: string): string {
    return this.CHANNELS().find((c) => c.value === channel)?.label ?? channel;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
