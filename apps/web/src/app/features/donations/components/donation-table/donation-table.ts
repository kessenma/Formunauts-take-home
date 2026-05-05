import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Table, type TableColumn, type TableSortParams } from '../../../../shared/components/table/table';
import type { Donation, SortParams } from '@formunauts/shared';

@Component({
  selector: 'app-donation-table',
  imports: [CurrencyPipe, DatePipe, Table],
  templateUrl: './donation-table.html',
  styleUrl: './donation-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationTable {
  readonly donations  = input.required<Donation[]>();
  readonly sortParams = input.required<SortParams>();
  readonly sortChange = output<SortParams>();

  readonly columns: TableColumn[] = [
    { key: 'donor',   label: 'Name',   sortKey: 'donorLastName' },
    { key: 'email',   label: 'Email' },
    { key: 'channel', label: 'Channel' },
    { key: 'amount',  label: 'Amount', sortKey: 'amount' },
    { key: 'method',  label: 'Method' },
    { key: 'date',    label: 'Date',   sortKey: 'date' },
  ];

  onSort(p: TableSortParams): void {
    this.sortChange.emit(p as SortParams);
  }
}
