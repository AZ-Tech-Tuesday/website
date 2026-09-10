#!/usr/bin/env bash
set -euo pipefail

INPUT_FILE="events.csv"
OUTPUT_FILE="events_reordered.csv"

if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: '$INPUT_FILE' not found." >&2
    exit 1
fi

# Original:
# 1=date, 2=location, 3=url, 4=sponsor, 5=sponsor_url, 6=logo, 7=badge, 8=spotlight
# Target: 1, 2, 3, 7, 6, 8, 4, 5
paste -d',' \
  <(cut -d',' -f1-3 "$INPUT_FILE") \
  <(cut -d',' -f7 "$INPUT_FILE") \
  <(cut -d',' -f6 "$INPUT_FILE") \
  <(cut -d',' -f8 "$INPUT_FILE") \
  <(cut -d',' -f4-5 "$INPUT_FILE") > "$OUTPUT_FILE"

echo "Success! Reordered CSV written to '$OUTPUT_FILE'."