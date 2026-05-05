import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Table, type TableColumn, type TableSortParams } from '../../../../shared/components/table/table';
import { LanguageService } from '../../../../core/services/language';
import type { Donation, SortParams } from '@formunauts/shared';

@Component({
  selector: 'app-donation-table',
  imports: [CurrencyPipe, DatePipe, Table, TranslocoPipe],
  templateUrl: './donation-table.html',
  styleUrl: './donation-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonationTable {
  readonly #lang     = inject(LanguageService);
  readonly #transloco = inject(TranslocoService);

  readonly donations  = input.required<Donation[]>();
  readonly sortParams = input.required<SortParams>();
  readonly sortChange = output<SortParams>();

  readonly columns = computed<TableColumn[]>(() => {
    this.#lang.lang();
    const t = (k: string) => this.#transloco.translate(k);
    return [
      { key: 'donor',   label: t('donationTable.name'),   sortKey: 'donorLastName' },
      { key: 'email',   label: t('donationTable.email') },
      { key: 'channel', label: t('donationTable.channel') },
      { key: 'amount',  label: t('donationTable.amount'), sortKey: 'amount' },
      { key: 'method',  label: t('donationTable.method') },
      { key: 'date',    label: t('donationTable.date'),   sortKey: 'date' },
    ];
  });

  onSort(p: TableSortParams): void {
    this.sortChange.emit(p as SortParams);
  }
}
