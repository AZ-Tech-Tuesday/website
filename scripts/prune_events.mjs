import fs from 'node:fs/promises';
import path from 'node:path';

// prune_events.mjs
// Usage: node scripts/prune_events.mjs [CSV_PATH] [KEEP_COUNT]
// Defaults:
//  CSV_PATH: website/src/_data/events.csv
//  KEEP_COUNT: 4 (keep up to 4 most recent past events)

const DEFAULT_KEEP = 4;
// Compute default CSV path relative to this script's location so it works
// regardless of current working directory when invoked.
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const DEFAULT_PATH = path.join(scriptDir, '..', 'website', 'src', '_data', 'events.csv');

const csvPath = process.argv[2] || process.env.IN || DEFAULT_PATH;
const keepCount = Number(process.argv[3] || process.env.KEEP || DEFAULT_KEEP);

function splitCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  fields.push(cur);
  return fields;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  const rawLines = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    rawLines.push({ line, lineNumber: i + 1 });
    const fields = splitCsvLine(line);
    // If there are more fields than headers, ignore extras but log a warning later.
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j] !== undefined ? fields[j] : '';
    }
    rows.push(obj);
  }
  return { headers, rows, rawLines };
}

function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const lines = [headerLine];
  for (const r of rows) {
    const line = headers.map(h => escapeCsvCell(r[h] ?? '')).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

function isoDateOf(record) {
  const d = (record.date || '').trim();
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(d)) return null;
  return d;
}

(async function main() {
  try {
    const raw = await fs.readFile(csvPath, 'utf8');
    const { headers, rows, rawLines } = parseCsv(raw);
    if (!headers.length) {
      console.error('No headers found in CSV. Aborting.');
      process.exit(1);
    }

    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    const past = [];
    const future = [];
    const invalid = [];

    for (const r of rows) {
      const iso = isoDateOf(r);
      if (!iso) {
        invalid.push(r);
        continue;
      }
      if (iso < todayIso) past.push(r);
      else future.push(r);
    }

    // sort past descending (newest first), keep first `keepCount`
    past.sort((a, b) => b.date.localeCompare(a.date));
    const keptPast = past.slice(0, keepCount);

    // combine keptPast + future and sort ascending for deterministic order
    const combined = [...keptPast, ...future];
    combined.sort((a, b) => a.date.localeCompare(b.date));

    const removedCount = past.length - keptPast.length;

    // Build normalized rows ensuring each output row has exactly headers.length columns.
    const normalizedRows = combined.map(r => {
      // Ensure all header keys exist
      const nr = {};
      for (const h of headers) nr[h] = r[h] ?? '';
      return nr;
    });

    const outCsv = buildCsv(headers, normalizedRows.concat(invalid));
    await fs.writeFile(csvPath, outCsv, 'utf8');

    console.log(`Pruned events CSV: kept ${keptPast.length} past events, ${future.length} future events; removed ${removedCount} older past events.`);
    console.log(`Wrote ${csvPath}`);
  } catch (err) {
    console.error('Error pruning events CSV:', err.message);
    process.exitCode = 1;
  }
})();
