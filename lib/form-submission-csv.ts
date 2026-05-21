import { isValidEmail, isValidPhone } from '@/lib/contactValidation';
import type { ExternalRecipientInput } from '@/types/formSubmissions';

export type CsvParseRowError = { line: number; message: string };

export type CsvParseResult = {
  rows: ExternalRecipientInput[];
  errors: CsvParseRowError[];
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '');
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseExternalRecipientsCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], errors: [{ line: 1, message: 'CSV is empty.' }] };
  }

  const headerCells = parseLine(lines[0]).map(normalizeHeader);
  const idxName = headerCells.findIndex((h) => h === 'fullname' || h === 'name');
  const idxEmail = headerCells.findIndex((h) => h === 'email' || h === 'emailaddress');
  const idxPhone = headerCells.findIndex(
    (h) => h === 'cellphone' || h === 'phone' || h === 'mobile' || h === 'cell',
  );

  const hasHeader = idxEmail >= 0 || idxPhone >= 0 || idxName >= 0;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const startLine = hasHeader ? 2 : 1;

  const rows: ExternalRecipientInput[] = [];
  const errors: CsvParseRowError[] = [];

  dataLines.forEach((line, i) => {
    const lineNo = startLine + i;
    const cells = parseLine(line);
    let fullName = '';
    let email = '';
    let cellphone = '';

    if (hasHeader) {
      fullName = idxName >= 0 ? cells[idxName] ?? '' : '';
      email = idxEmail >= 0 ? cells[idxEmail] ?? '' : '';
      cellphone = idxPhone >= 0 ? cells[idxPhone] ?? '' : '';
    } else if (cells.length >= 3) {
      fullName = cells[0];
      email = cells[1];
      cellphone = cells[2];
    } else if (cells.length === 2) {
      email = cells[0];
      cellphone = cells[1];
    } else if (cells.length === 1) {
      const v = cells[0];
      if (v.includes('@')) email = v;
      else cellphone = v;
    }

    const e = email.trim();
    const p = cellphone.trim();
    const n = fullName.trim();

    if (!e && !p) {
      errors.push({ line: lineNo, message: 'Row needs at least email or cellphone.' });
      return;
    }
    if (e && !isValidEmail(e)) {
      errors.push({ line: lineNo, message: `Invalid email: ${e}` });
      return;
    }
    if (p && !isValidPhone(p)) {
      errors.push({ line: lineNo, message: `Invalid cellphone: ${p}` });
      return;
    }

    rows.push({
      fullName: n || undefined,
      email: e || undefined,
      cellphone: p || undefined,
    });
  });

  return { rows, errors };
}

export function dedupeExternalRecipients(rows: ExternalRecipientInput[]): ExternalRecipientInput[] {
  const seen = new Set<string>();
  const out: ExternalRecipientInput[] = [];
  for (const r of rows) {
    const key = `${(r.email ?? '').toLowerCase()}|${(r.cellphone ?? '').replace(/\s/g, '')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
