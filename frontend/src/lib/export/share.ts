import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/lib/db/database';
import { listBetween, totalsBetween } from '@/lib/db/transactions';
import { toLocalStamp } from '@/lib/time';

import { buildCsv, buildHtml, buildText } from './build';
import { ExportPeriod, exportRange } from './range';

export type ExportFormat = 'pdf' | 'txt' | 'csv';
export type ExportOutcome = 'shared' | 'empty' | 'unavailable';

const FORMATS = {
  pdf: { ext: 'pdf', mime: 'application/pdf', uti: 'com.adobe.pdf' },
  txt: { ext: 'txt', mime: 'text/plain', uti: 'public.plain-text' },
  csv: { ext: 'csv', mime: 'text/csv', uti: 'public.comma-separated-values-text' },
} as const;

// All exports go in one folder, emptied before each new export, so old copies of
// someone's finances don't pile up in the cache. It can't be emptied right after
// sharing, because the receiving app may still be reading the file.
function freshExportDir(): Directory {
  const dir = new Directory(Paths.cache, 'exports');
  try {
    if (dir.exists) dir.delete();
  } catch {
    /* best effort */
  }
  try {
    dir.create();
  } catch {
    /* already there */
  }
  return dir;
}

export async function exportTransactions(
  format: ExportFormat,
  period: ExportPeriod
): Promise<ExportOutcome> {
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';

  const db = await getDb();
  const range = exportRange(period);
  const [rows, totals] = await Promise.all([
    listBetween(db, range.from, range.to),
    totalsBetween(db, range.from, range.to),
  ]);
  if (rows.length === 0) return 'empty';

  const exportedAt = toLocalStamp(new Date());
  const input = { rows, totals, periodLabel: range.label, exportedAt };
  const { ext, mime, uti } = FORMATS[format];
  const target = new File(freshExportDir(), `pesaplan-transactions-${exportedAt.slice(0, 10)}.${ext}`);

  let uri: string;
  if (format === 'pdf') {
    // A4 in points
    const printed = await Print.printToFileAsync({ html: buildHtml(input), width: 595, height: 842 });
    try {
      new File(printed.uri).copy(target); // gives the file a readable name
      new File(printed.uri).delete();
      uri = target.uri;
    } catch {
      uri = printed.uri; // fall back to the generated name
    }
  } else {
    target.create();
    await target.write(format === 'csv' ? buildCsv(input) : buildText(input));
    uri = target.uri;
  }

  await Sharing.shareAsync(uri, { mimeType: mime, UTI: uti, dialogTitle: 'Export transactions' });
  return 'shared';
}