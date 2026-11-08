import fs from 'node:fs';
import csv from 'csv-parser';

/**
 * Synchronous RFC-4180 CSV/TSV row parser.
 * Properly handles quoted fields with delimiters, newlines, and escaped quotes ("").
 * Automatically ignores comment lines starting with '#' and blank lines.
 */
export function parseCsvRowsSync(content: string, separator = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let isRowStart = true;
  let isComment = false;

  const len = content.length;
  for (let i = 0; i < len; i++) {
    const char = content[i];

    if (isRowStart && char === '#' && !inQuotes) {
      isComment = true;
    }

    if (isComment) {
      if (char === '\n' || char === '\r') {
        isComment = false;
        isRowStart = true;
        if (char === '\r' && i + 1 < len && content[i + 1] === '\n') {
          i++;
        }
      }
      continue;
    }

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < len && content[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        isRowStart = false;
      } else if (char === separator) {
        currentRow.push(currentField);
        currentField = '';
        isRowStart = false;
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && i + 1 < len && content[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        currentField = '';

        const isBlank = currentRow.length === 1 && currentRow[0].trim() === '';
        if (!isBlank) {
          rows.push(currentRow);
        }
        currentRow = [];
        isRowStart = true;
      } else {
        currentField += char;
        isRowStart = false;
      }
    }
  }

  if (!isComment) {
    if (inQuotes) {
      inQuotes = false;
    }
    if (currentField.length > 0 || currentRow.length > 0) {
      currentRow.push(currentField);
      const isBlank = currentRow.length === 1 && currentRow[0].trim() === '';
      if (!isBlank) {
        rows.push(currentRow);
      }
    }
  }

  return rows;
}

/**
 * Synchronous RFC-4180 CSV record parser mapping each row to header keys.
 */
export function parseCsvRecordsSync(
  content: string,
  separator = ',',
): Array<Record<string, string>> {
  const rows = parseCsvRowsSync(content, separator);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((h) => h.trim());
  const records: Array<Record<string, string>> = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const header = headers[c];
      if (header) {
        record[header] = row[c] ?? '';
      }
    }
    records.push(record);
  }

  return records;
}

/**
 * Asynchronously streams CSV records from disk using `csv-parser`.
 */
export async function* streamCsvFile(
  filePath: string,
  separator = ',',
): AsyncIterable<Record<string, string>> {
  const stream = fs.createReadStream(filePath).pipe(csv({ separator }));
  for await (const row of stream) {
    yield row as Record<string, string>;
  }
}
