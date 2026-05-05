import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Table, type TableColumn } from '../../../../shared/components/table/table';
import type { DonorSummary } from '@formunauts/shared';

@Component({
  selector: 'app-donor-table',
  imports: [CurrencyPipe, DatePipe, Table],
  templateUrl: './donor-table.html',
  styleUrl: './donor-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonorTable {
  readonly donors = input.required<DonorSummary[]>();

  readonly columns: TableColumn[] = [
    { key: 'name',          label: 'Name' },
    { key: 'email',         label: 'Email' },
    { key: 'phone',         label: 'Phone' },
    { key: 'city',          label: 'City' },
    { key: 'totalDonated',  label: 'Total Donated' },
    { key: 'donationCount', label: 'Donations' },
    { key: 'lastDonation',  label: 'Last Donation' },
  ];
}
