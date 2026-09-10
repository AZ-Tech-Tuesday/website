import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

// ===========================================================================
// CONFIGURATION
// ===========================================================================

// Set the paths relative to where you run the script. 
// This targets a file named "input.csv" inside the "data" folder.
const INPUT_PATH = path.join(process.cwd(), 'scripts', 'previous_events.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'scripts', 'reordered_previous_events.csv');

// Specify the exact column names you want first, in order:
// date,location,url,
const DESIRED_ORDER = ['date', 'location', 'url', 'logo', 'badge', 'spotlight'];

//
// If true, any columns in the CSV not listed above will be tacked on at the end.
// If false, unlisted columns will be deleted from the output.
const KEEP_REMAINING_COLUMNS = true;


// ===========================================================================
// SCRIPT LOGIC
// ===========================================================================

/**
 * Escapes a cell value conforming to standard CSV specification (RFC 4180).
 */
function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function run() {
  try {
    // 1. Read the raw file
    const content = await fs.readFile(INPUT_PATH, 'utf-8');

    // 2. Parse CSV into an array of objects keyed by header names
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    if (records.length === 0) {
      console.warn('The CSV file is empty. No output written.');
      return;
    }

    // 3. Determine all available headers from the original file
    const originalHeaders = Object.keys(records[0]);

    // 4. Validate the specified columns exist in the file
    const validSpecified = DESIRED_ORDER.filter(col => {
      const exists = originalHeaders.includes(col);
      if (!exists) {
        console.warn(`Warning: Column "${col}" was not found in the input CSV headers.`);
      }
      return exists;
    });

    // 5. Calculate remaining columns if we are keeping them
    const unlistedColumns = KEEP_REMAINING_COLUMNS
      ? originalHeaders.filter(col => !validSpecified.includes(col))
      : [];

    // 6. Combine for the final ordered header list
    const finalHeaders = [...validSpecified, ...unlistedColumns];

    // 7. Build the new CSV string
    const headerLine = finalHeaders.map(escapeCsvCell).join(',');
    const rowLines = records.map(record =>
      finalHeaders.map(col => escapeCsvCell(record[col])).join(',')
    );
    const outputCsv = [headerLine, ...rowLines].join('\n');

    // 8. Write the output to disk
    await fs.writeFile(OUTPUT_PATH, outputCsv, 'utf-8');
    
    console.log(`Successfully reordered columns.`);
    console.log(`Saved to: ${OUTPUT_PATH}`);

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: Could not find the input file at ${INPUT_PATH}`);
      console.error('Make sure the "data" folder exists and contains "input.csv".');
    } else {
      console.error('An error occurred while processing the CSV:', error);
    }
  }
}

// Execute the script
await run();