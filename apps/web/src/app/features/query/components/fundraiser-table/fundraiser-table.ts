import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Table, type TableColumn } from '../../../../shared/components/table/table';
import type { FundraiserStats } from '@formunauts/shared';

@Component({
  selector: 'app-fundraiser-table',
  imports: [CurrencyPipe, Table],
  templateUrl: './fundraiser-table.html',
  styleUrl: './fundraiser-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FundraiserTable {
  readonly fundraisers = input.required<FundraiserStats[]>();

  readonly columns: TableColumn[] = [
    { key: 'name',          label: 'Name' },
    { key: 'email',         label: 'Email' },
    { key: 'phone',         label: 'Phone' },
    { key: 'active',        label: 'Active' },
    { key: 'totalRaised',   label: 'Total Raised' },
    { key: 'donationCount', label: 'Donations' },
  ];
}
