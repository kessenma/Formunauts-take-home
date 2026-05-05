import { ChangeDetectionStrategy, Component, computed, signal, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { FundraiserFilterParams } from '@formunauts/shared';
import { Dropdown } from '../../../../shared/components/dropdown/dropdown';

const ACTIVE_OPTIONS = [
  { value: '', label: 'All fundraisers' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

@Component({
  selector: 'app-fundraiser-filter-bar',
  imports: [NgIcon, Dropdown],
  templateUrl: './fundraiser-filter-bar.html',
  styleUrl: './fundraiser-filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundraiserFilterBar {
  readonly filter = input<FundraiserFilterParams>({});
  readonly isLoading = input(false);

  readonly filterChange = output<FundraiserFilterParams>();

  readonly ACTIVE_OPTIONS = ACTIVE_OPTIONS;

  readonly filtersOpen = signal(false);

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.isActive !== undefined);
  });

  readonly activeChips = computed(() => {
    const f = this.filter();
    const chips: Array<{ label: string; clear: () => void }> = [];
    if (f.search) {
      chips.push({ label: `"${f.search}"`, clear: () => this.clearField('search') });
    }
    if (f.isActive !== undefined) {
      chips.push({ label: f.isActive ? 'Active' : 'Inactive', clear: () => this.clearField('isActive') });
    }
    return chips;
  });

  readonly activeFilterCount = computed(() => this.activeChips().length);

  readonly currentActiveValue = computed(() => {
    const v = this.filter().isActive;
    return v === undefined ? '' : String(v);
  });

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

  onActiveChange(value: string): void {
    this.filterChange.emit({
      ...this.filter(),
      isActive: value === '' ? undefined : value === 'true',
    });
  }

  clearFilters(): void {
    this.filterChange.emit({});
  }

  clearField(field: keyof FundraiserFilterParams): void {
    const updated = { ...this.filter() };
    delete updated[field];
    this.filterChange.emit(updated);
  }
}
