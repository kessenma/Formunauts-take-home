import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Table, type TableColumn } from '../../../../shared/components/table/table';
import type { Organization } from '@formunauts/shared';

@Component({
  selector: 'app-organization-table',
  imports: [Table],
  templateUrl: './organization-table.html',
  styleUrl: './organization-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTable {
  readonly organizations = input.required<Organization[]>();

  readonly columns: TableColumn[] = [
    { key: 'name',    label: 'Name' },
    { key: 'type',    label: 'Type' },
    { key: 'country', label: 'Country' },
    { key: 'website', label: 'Website' },
  ];
}
