import { ChangeDetectionStrategy, Component, computed, signal, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { OrganizationFilterParams, OrgType } from '@formunauts/shared';
import { Dropdown } from '../../../../shared/components/dropdown/dropdown';

const TYPE_OPTIONS: Array<{ value: OrgType | ''; label: string }> = [
  { value: '', label: 'All types' },
  { value: 'npo', label: 'NPO' },
  { value: 'fundraising_agency', label: 'Fundraising Agency' },
];

@Component({
  selector: 'app-organization-filter-bar',
  imports: [NgIcon, Dropdown],
  templateUrl: './organization-filter-bar.html',
  styleUrl: './organization-filter-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationFilterBar {
  readonly filter = input<OrganizationFilterParams>({});

  readonly filterChange = output<OrganizationFilterParams>();

  readonly TYPE_OPTIONS = TYPE_OPTIONS;

  readonly filtersOpen = signal(false);

  readonly hasActiveFilters = computed(() => {
    const f = this.filter();
    return !!(f.search || f.type);
  });

  readonly activeChips = computed(() => {
    const f = this.filter();
    const chips: Array<{ label: string; clear: () => void }> = [];
    if (f.search) {
      chips.push({ label: `"${f.search}"`, clear: () => this.clearField('search') });
    }
    if (f.type) {
      const label = TYPE_OPTIONS.find(t => t.value === f.type)?.label ?? f.type;
      chips.push({ label, clear: () => this.clearField('type') });
    }
    return chips;
  });

  readonly activeFilterCount = computed(() => this.activeChips().length);

  readonly currentTypeValue = computed(() => this.filter().type ?? '');

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

  onTypeChange(value: string): void {
    this.filterChange.emit({
      ...this.filter(),
      type: value ? (value as OrgType) : undefined,
    });
  }

  clearFilters(): void {
    this.filterChange.emit({});
  }

  clearField(field: keyof OrganizationFilterParams): void {
    const updated = { ...this.filter() };
    delete updated[field];
    this.filterChange.emit(updated);
  }
}
