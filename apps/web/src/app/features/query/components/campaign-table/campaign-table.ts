import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Table, type TableColumn } from '../../../../shared/components/table/table';
import type { CampaignSummary } from '@formunauts/shared';

@Component({
  selector: 'app-campaign-table',
  imports: [CurrencyPipe, DatePipe, Table],
  templateUrl: './campaign-table.html',
  styleUrl: './campaign-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignTable {
  readonly campaigns = input.required<CampaignSummary[]>();

  readonly columns: TableColumn[] = [
    { key: 'title',        label: 'Title' },
    { key: 'organization', label: 'Organization' },
    { key: 'status',       label: 'Status' },
    { key: 'goal',         label: 'Goal' },
    { key: 'totalRaised',  label: 'Total Raised' },
    { key: 'donorCount',   label: 'Donors' },
    { key: 'startDate',    label: 'Start Date' },
    { key: 'endDate',      label: 'End Date' },
  ];
}
