import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { PaginatedResponse, Donation, FilterParams, PaymentMethod, DonationChannel } from '@formunauts/shared';
import type { ViewMode } from '../../../../core/services/donation';

@Component({
  selector: 'app-donation-filter-bar',
  imports: [NgIcon],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationFilterBar {
  readonly pagination = input<PaginatedResponse<Donation> | undefined>();
  readonly limit = input(10);
  readonly viewMode = input<ViewMode>('pagination');
  readonly filter = input<FilterParams>({});
  readonly isLoading = input(false);

  readonly pageChange = output<number>();
  readonly limitChange = output<number>();
  readonly viewModeChange = output<ViewMode>();
  readonly filterChange = output<FilterParams>();

  readonly LIMIT_OPTIONS = [10, 25, 50, 100, 0];
  readonly PAYMENT_METHODS: Array<{ value: PaymentMethod | ''; label: string }> = [
    { value: '', label: 'All methods' },
    { value: 'sepa_direct_debit', label: 'SEPA Direct Debit' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'google_pay', label: 'Google Pay' },
    { value: 'apple_pay', label: 'Apple Pay' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
  ];
  readonly CHANNELS: Array<{ value: DonationChannel | ''; label: string }> = [
    { value: '', label: 'All channels' },
    { value: 'street', label: 'Street' },
    { value: 'door_to_door', label: 'Door to Door' },
    { value: 'event', label: 'Event' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'social_media', label: 'Social Media' },
  ];

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.paymentMethod || f.channel || f.minAmount != null || f.maxAmount != null || f.dateFrom || f.dateTo);
  });

  // Chips summarise active filters so users can see what's applied at a glance
  // and remove individual filters without hunting through the inputs.
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

  readonly pages = computed(() => {
    const p = this.pagination();
    if (!p) return [];
    const range: number[] = [];
    const delta = 2;
    for (let i = Math.max(1, p.page - delta); i <= Math.min(p.totalPages, p.page + delta); i++) {
      range.push(i);
    }
    return range;
  });

  readonly rangeStart = computed(() => {
    const p = this.pagination();
    return p ? (p.page - 1) * this.limit() + 1 : 0;
  });

  readonly rangeEnd = computed(() => {
    const p = this.pagination();
    return p ? (this.limit() === 0 ? p.total : Math.min(p.page * this.limit(), p.total)) : 0;
  });

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
    return this.PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
  }

  getChannelLabel(channel: string): string {
    return this.CHANNELS.find((c) => c.value === channel)?.label ?? channel;
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  go(page: number): void {
    const p = this.pagination();
    if (!p || page < 1 || page > p.totalPages) return;
    this.pageChange.emit(page);
  }

  goToPage(input: HTMLInputElement): void {
    const page = parseInt(input.value, 10);
    input.value = '';
    this.go(page);
  }

  selectLimit(opt: number): void {
    if (opt === 0) {
      this.viewModeChange.emit(this.viewMode() === 'infinite' ? 'pagination' : 'infinite');
    } else {
      if (this.viewMode() === 'infinite') this.viewModeChange.emit('pagination');
      this.limitChange.emit(opt);
    }
  }
}
