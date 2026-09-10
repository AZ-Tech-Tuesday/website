import fs from 'fs/promises';

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

async function validate(path) {
  const raw = await fs.readFile(path, 'utf8');
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const problems = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '') continue;
    const fields = splitCsvLine(line);
    if (fields.length !== headers.length) {
      problems.push({ line: i + 1, expected: headers.length, found: fields.length, text: line });
    }
  }
  return problems;
}

async function main() {
  const targets = [
    '../website/src/_data/events.csv',
    '../website/src/_data/previous_events.csv'
  ];
  let any = false;
  for (const t of targets) {
    try {
      const p = new URL(t, `file://${process.cwd()}/`).pathname;
      const probs = await validate(p);
      if (probs.length) {
        any = true;
        console.log(`Problems in ${t}:`);
        for (const p of probs) {
          console.log(`  Line ${p.line}: expected ${p.expected}, found ${p.found}`);
          console.log(`    ${p.text}`);
        }
      } else {
        console.log(`${t} OK`);
      }
    } catch (err) {
      console.error(`Failed to read ${t}: ${err.message}`);
      any = true;
    }
  }
  process.exit(any ? 1 : 0);
}

if (import.meta.url === `file://${process.cwd()}/` + process.argv[1]) {
  main();
}
