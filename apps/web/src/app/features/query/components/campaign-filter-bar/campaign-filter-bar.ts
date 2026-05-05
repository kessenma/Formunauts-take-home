import { ChangeDetectionStrategy, Component, computed, signal, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { CampaignFilterParams, CampaignStatus } from '@formunauts/shared';
import { Dropdown } from '../../../../shared/components/dropdown/dropdown';

const STATUS_OPTIONS: Array<{ value: CampaignStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

@Component({
  selector: 'app-campaign-filter-bar',
  imports: [NgIcon, Dropdown],
  templateUrl: './campaign-filter-bar.html',
  styleUrl: './campaign-filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignFilterBar {
  readonly filter = input<CampaignFilterParams>({});

  readonly filterChange = output<CampaignFilterParams>();

  readonly STATUS_OPTIONS = STATUS_OPTIONS;

  readonly filtersOpen = signal(false);

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.status);
  });

  readonly activeChips = computed(() => {
    const f = this.filter();
    const chips: Array<{ label: string; clear: () => void }> = [];
    if (f.search) {
      chips.push({ label: `"${f.search}"`, clear: () => this.clearField('search') });
    }
    if (f.status) {
      const label = STATUS_OPTIONS.find(s => s.value === f.status)?.label ?? f.status;
      chips.push({ label, clear: () => this.clearField('status') });
    }
    return chips;
  });

  readonly activeFilterCount = computed(() => this.activeChips().length);

  readonly currentStatusValue = computed(() => this.filter().status ?? '');

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

  onStatusChange(value: string): void {
    this.filterChange.emit({
      ...this.filter(),
      status: value ? (value as CampaignStatus) : undefined,
    });
  }

  clearFilters(): void {
    this.filterChange.emit({});
  }

  clearField(field: keyof CampaignFilterParams): void {
    const updated = { ...this.filter() };
    delete updated[field];
    this.filterChange.emit(updated);
  }
}
