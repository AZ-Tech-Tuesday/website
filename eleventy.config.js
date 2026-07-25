import { parse } from "csv-parse/sync";

export default function (eleventyConfig) {
  // Any .csv file placed in src/_data becomes an array of objects keyed
  // by header row (date, location, url, sponsor, sponsor_url, logo, badge,
  // spotlight) — the same shape parseCSV() built by hand in the old app.js.
  eleventyConfig.addDataExtension("csv", (contents) => {
    return parse(contents, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  });

  // "2026-06-02" -> "Tue, Jun 2, 2026" (matches the old fmtDate())
  eleventyConfig.addFilter("eventDate", (iso) => {
    const parts = String(iso).split("-").map(Number);
    if (parts.length !== 3) return iso;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  });

  // ISO date strings sort correctly as plain strings, same as the
  // original rows.sort((a, b) => a.date.localeCompare(b.date))
  eleventyConfig.addFilter("sortByDate", (events) =>
    [...events].sort((a, b) => a.date.localeCompare(b.date))
  );

  // Static assets — copied through untouched
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/members");
  eleventyConfig.addPassthroughCopy("src/sponsors");
  eleventyConfig.addPassthroughCopy("src/js");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
}
