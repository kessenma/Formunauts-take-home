import { ChangeDetectionStrategy, Component, computed, signal, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { DonorFilterParams } from '@formunauts/shared';
import { Dropdown } from '../../../../shared/components/dropdown/dropdown';

const COUNTRIES: Array<{ value: string; label: string }> = [
  { value: '', label: 'All countries' },
  { value: 'AT', label: 'Austria' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'DE', label: 'Germany' },
  { value: 'ES', label: 'Spain' },
  { value: 'FR', label: 'France' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'PL', label: 'Poland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'SE', label: 'Sweden' },
  { value: 'US', label: 'United States' },
];

@Component({
  selector: 'app-donor-filter-bar',
  imports: [NgIcon, Dropdown],
  templateUrl: './donor-filter-bar.html',
  styleUrl: './donor-filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonorFilterBar {
  readonly filter = input<DonorFilterParams>({});
  readonly isLoading = input(false);

  readonly filterChange = output<DonorFilterParams>();

  readonly COUNTRIES = COUNTRIES;

  readonly filtersOpen = signal(false);

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.country);
  });

  readonly activeChips = computed(() => {
    const f = this.filter();
    const chips: Array<{ label: string; clear: () => void }> = [];
    if (f.search) {
      chips.push({ label: `"${f.search}"`, clear: () => this.clearField('search') });
    }
    if (f.country) {
      const label = COUNTRIES.find(c => c.value === f.country)?.label ?? f.country;
      chips.push({ label, clear: () => this.clearField('country') });
    }
    return chips;
  });

  readonly activeFilterCount = computed(() => this.activeChips().length);

  readonly currentCountryValue = computed(() => this.filter().country ?? '');

  toggleFilters(): void {
    this.filtersOpen.update(v => !v);
  }

  private searchTimer?: ReturnType<typeof setTimeout>;

  onSearchInput(value: string): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.filterChange.emit({ ...this.filter(), search: value.trim() || undefined });
    }, 300);
  }

  onCountryChange(value: string): void {
    this.filterChange.emit({ ...this.filter(), country: value || undefined });
  }

  clearFilters(): void {
    this.filterChange.emit({});
  }

  clearField(field: keyof DonorFilterParams): void {
    const updated = { ...this.filter() };
    delete updated[field];
    this.filterChange.emit(updated);
  }
}
