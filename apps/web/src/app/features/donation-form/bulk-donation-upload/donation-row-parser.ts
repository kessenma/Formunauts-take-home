import type { CreateDonationRequest } from '@formunauts/shared';

export interface ValidationIssue {
  row: number;
  field: keyof CreateDonationRequest;
  originalValue: string;
  correctedValue?: string;
  suggestedValue?: string;
  type: 'error' | 'corrected';
}

export interface ParsedDonationRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  amount: string;
  paymentMethod: string;
  channel: string;
}

export interface UploadResult {
  row: number;
  donorName: string;
  success: boolean;
  error?: string;
}

export const CSV_HEADERS = ['firstName', 'lastName', 'email', 'amount', 'paymentMethod', 'channel'] as const;

export const TEMPLATE_DATA =
  'firstName,lastName,email,amount,paymentMethod,channel\n' +
  'Jane,Doe,jane@example.com,50,credit_card,street\n' +
  'John,Smith,john@example.com,120,sepa_direct_debit,door_to_door\n' +
  'Alice,Brown,,25,cash,event';

export const VALID_PAYMENT_METHODS = [
  'sepa_direct_debit', 'credit_card', 'google_pay', 'apple_pay', 'paypal', 'bank_transfer', 'cash',
] as const;

export const VALID_CHANNELS = [
  'street', 'door_to_door', 'event', 'phone', 'email', 'social_media',
] as const;

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }
  return matrix[b.length][a.length];
}

function normalise(v: string): string {
  return v.toLowerCase().replace(/[_\s]+/g, ' ').trim();
}

function findCaseInsensitiveMatch(value: string, validOptions: readonly string[]): string | null {
  if ((validOptions as string[]).includes(value)) return value;
  const lv = normalise(value);
  return validOptions.find((opt) => normalise(opt) === lv) ?? null;
}

function findClosestMatch(value: string, validOptions: readonly string[]): string | null {
  if (!value || validOptions.length === 0) return null;
  const lv = normalise(value);

  const containsMatch = validOptions.find(
    (opt) => normalise(opt).includes(lv) || lv.includes(normalise(opt)),
  );
  if (containsMatch) return containsMatch;

  let bestMatch: string | null = null;
  let bestDist = Infinity;
  for (const opt of validOptions) {
    const d = levenshteinDistance(lv, normalise(opt));
    if (d < bestDist && d <= Math.max(value.length, opt.length) / 2) {
      bestDist = d;
      bestMatch = opt;
    }
  }
  return bestMatch;
}

function validateEnumField(
  value: string,
  validOptions: readonly string[],
  rowNum: number,
  fieldName: keyof CreateDonationRequest,
  issues: ValidationIssue[],
): string {
  if (!value) {
    issues.push({ row: rowNum, field: fieldName, originalValue: value, type: 'error' });
    return value;
  }
  const match = findCaseInsensitiveMatch(value, validOptions);
  if (match) {
    if (match !== value) {
      issues.push({ row: rowNum, field: fieldName, originalValue: value, correctedValue: match, type: 'corrected' });
    }
    return match;
  }
  const suggested = findClosestMatch(value, validOptions);
  issues.push({ row: rowNum, field: fieldName, originalValue: value, suggestedValue: suggested ?? undefined, type: 'error' });
  return value;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): { rows: ParsedDonationRow[]; issues: ValidationIssue[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

  const headers = lines[0].split(',').map((h) => h.trim());
  const missing = (CSV_HEADERS as readonly string[]).filter((h) => !headers.includes(h));
  if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);

  const rows: ParsedDonationRow[] = [];
  const issues: ValidationIssue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
    }

    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => { raw[h] = values[idx]; });

    const rowNum = i + 1;

    const firstName = raw['firstName']?.trim() ?? '';
    if (!firstName || firstName.length < 1) {
      issues.push({ row: rowNum, field: 'firstName', originalValue: firstName, type: 'error' });
    }

    const lastName = raw['lastName']?.trim() ?? '';
    if (!lastName || lastName.length < 1) {
      issues.push({ row: rowNum, field: 'lastName', originalValue: lastName, type: 'error' });
    }

    // email is optional — only validate format if provided
    const email = raw['email']?.trim().toLowerCase() ?? '';
    if (email && !EMAIL_RE.test(email)) {
      issues.push({ row: rowNum, field: 'email', originalValue: raw['email'] ?? '', type: 'error' });
    }

    const amountRaw = raw['amount']?.trim() ?? '';
    const amountNum = parseFloat(amountRaw);
    if (!amountRaw || isNaN(amountNum) || amountNum < 1) {
      issues.push({ row: rowNum, field: 'amount', originalValue: amountRaw, type: 'error' });
    }

    const paymentMethod = validateEnumField(
      raw['paymentMethod']?.trim() ?? '',
      VALID_PAYMENT_METHODS,
      rowNum,
      'paymentMethod',
      issues,
    );

    const channel = validateEnumField(
      raw['channel']?.trim() ?? '',
      VALID_CHANNELS,
      rowNum,
      'channel',
      issues,
    );

    rows.push({ id: rowNum, firstName, lastName, email, amount: amountRaw, paymentMethod, channel });
  }

  return { rows, issues };
}
