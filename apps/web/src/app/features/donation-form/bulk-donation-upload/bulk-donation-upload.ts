import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import type { CreateDonationRequest } from '@formunauts/shared';
import { DonationService } from '../../../core/services/donation';
import { CampaignService } from '../../../core/services/campaign';
import { Modal } from '../../../shared/components/modal/modal';
import { Table, type TableColumn } from '../../../shared/components/table/table';
import {
  parseCSV,
  TEMPLATE_DATA,
  VALID_PAYMENT_METHODS,
  VALID_CHANNELS,
  type ParsedDonationRow,
  type ValidationIssue,
  type UploadResult,
} from './donation-row-parser';

type RowField = keyof Omit<ParsedDonationRow, 'id'>;

@Component({
  selector: 'app-bulk-donation-upload',
  imports: [Modal, NgIcon, Table],
  templateUrl: './bulk-donation-upload.html',
  styleUrl: './bulk-donation-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkDonationUpload {
  readonly #donationService = inject(DonationService);
  readonly #campaignService = inject(CampaignService);

  readonly file = signal<File | null>(null);
  readonly rows = signal<ParsedDonationRow[]>([]);
  readonly issues = signal<ValidationIssue[]>([]);
  readonly parseError = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly results = signal<UploadResult[]>([]);
  readonly showResults = signal(false);

  readonly correctedIssues = computed(() => this.issues().filter((i) => i.type === 'corrected'));
  readonly errorIssues = computed(() => this.issues().filter((i) => i.type === 'error'));
  readonly hasErrors = computed(() => this.errorIssues().length > 0);
  readonly errorsWithFix = computed(() => this.errorIssues().filter((i) => i.suggestedValue));
  readonly canUpload = computed(() => this.rows().length > 0 && !this.hasErrors() && !this.uploading());
  readonly successCount = computed(() => this.results().filter((r) => r.success).length);
  readonly failCount = computed(() => this.results().filter((r) => !r.success).length);

  readonly validPaymentMethods = VALID_PAYMENT_METHODS;
  readonly validChannels = VALID_CHANNELS;
  readonly previewExpanded = signal(false);

  readonly compactColumns: TableColumn[] = [
    { key: 'id',            label: '#' },
    { key: 'firstName',     label: 'First' },
    { key: 'lastName',      label: 'Last' },
    { key: 'email',         label: 'Email' },
    { key: 'amount',        label: 'Amt' },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'channel',       label: 'Channel' },
  ];

  readonly modalColumns: TableColumn[] = [
    { key: 'id',            label: '#' },
    { key: 'firstName',     label: 'First Name' },
    { key: 'lastName',      label: 'Last Name' },
    { key: 'email',         label: 'Email' },
    { key: 'amount',        label: 'Amount ($)' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'channel',       label: 'Channel' },
  ];

  downloadTemplate(): void {
    const blob = new Blob([TEMPLATE_DATA], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'donations_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    if (!selected) return;

    this.file.set(selected);
    this.rows.set([]);
    this.issues.set([]);
    this.parseError.set(null);
    this.results.set([]);
    this.showResults.set(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const { rows, issues } = parseCSV(text);
        this.rows.set(rows);
        this.issues.set(issues);
      } catch (err) {
        this.parseError.set(err instanceof Error ? err.message : 'Failed to parse CSV');
      }
    };
    reader.readAsText(selected);
  }

  clearFile(): void {
    this.file.set(null);
    this.rows.set([]);
    this.issues.set([]);
    this.parseError.set(null);
    this.results.set([]);
    this.showResults.set(false);
  }

  updateRow(rowId: number, field: RowField, value: string): void {
    this.rows.update((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)),
    );
    this.issues.update((prev) =>
      prev.filter((i) => !(i.row === rowId && i.field === field)),
    );
  }

  getCellIssue(rowId: number, field: RowField): ValidationIssue | undefined {
    return this.issues().find((i) => i.row === rowId && i.field === field);
  }

  rowHasError(rowId: number): boolean {
    return this.issues().some((i) => i.row === rowId && i.type === 'error');
  }

  isValidPaymentMethod(value: string): boolean {
    return (this.validPaymentMethods as readonly string[]).includes(value);
  }

  isValidChannel(value: string): boolean {
    return (this.validChannels as readonly string[]).includes(value);
  }

  applySuggestion(issue: ValidationIssue): void {
    if (!issue.suggestedValue) return;
    this.updateRow(issue.row, issue.field as RowField, issue.suggestedValue);
  }

  applyAllSuggestions(): void {
    this.errorsWithFix().forEach((issue) => this.applySuggestion(issue));
  }

  async uploadAll(): Promise<void> {
    if (!this.canUpload()) return;
    const campaignId = this.#campaignService.campaignResource.value()?.id;
    if (!campaignId) return;
    this.uploading.set(true);
    this.results.set([]);

    const collected: UploadResult[] = [];
    for (const row of this.rows()) {
      const donorName = `${row.firstName} ${row.lastName}`;
      try {
        await lastValueFrom(
          this.#donationService.submit({
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email || undefined,
            amount: parseFloat(row.amount),
            paymentMethod: row.paymentMethod as CreateDonationRequest['paymentMethod'],
            channel: row.channel as CreateDonationRequest['channel'],
            campaignId,
          }),
        );
        collected.push({ row: row.id, donorName, success: true });
      } catch (err) {
        collected.push({
          row: row.id,
          donorName,
          success: false,
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    }

    this.results.set(collected);
    this.showResults.set(true);
    this.uploading.set(false);
  }

  startOver(): void {
    this.clearFile();
    this.showResults.set(false);
  }
}
