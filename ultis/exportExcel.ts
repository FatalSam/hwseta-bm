import * as XLSX from 'xlsx';

export function exportRowsToExcel(
  filename: string,
  rows: Record<string, string | number | boolean | null>[],
  sheetName = 'Sheet1',
) {
  if (rows.length === 0 || typeof window === 'undefined') return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const normalized = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, normalized, { compression: true });
}
