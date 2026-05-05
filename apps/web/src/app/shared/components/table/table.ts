import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

export interface TableColumn {
  key: string;
  label: string;
  sortKey?: string;
}

export interface TableSortParams {
  sort: string;
  order: 'asc' | 'desc';
}

@Component({
  selector: 'app-table',
  imports: [NgIcon],
  templateUrl: './table.html',
  styleUrl: './table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Table {
  readonly columns      = input.required<TableColumn[]>();
  readonly sortParams   = input<TableSortParams | null>(null);
  readonly isEmpty      = input<boolean>(false);
  readonly emptyMessage = input<string>('No items found.');
  readonly ariaLabel    = input<string>('Table');
  readonly sortChange   = output<TableSortParams>();

  sort(sortKey: string): void {
    const cur = this.sortParams();
    this.sortChange.emit({
      sort: sortKey,
      order: cur?.sort === sortKey && cur.order === 'asc' ? 'desc' : 'asc',
    });
  }

  sortIconName(sortKey: string): string {
    const p = this.sortParams();
    if (p?.sort !== sortKey) return 'solarSortBoldDuotone';
    return p.order === 'asc' ? 'solarAltArrowUpBoldDuotone' : 'solarAltArrowDownBoldDuotone';
  }
}
