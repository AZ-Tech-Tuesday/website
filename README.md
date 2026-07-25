# AZ Tech Tuesday — static site (Eleventy)

Same Bootstrap look, but the events table, members grid, and sponsor grid
are now rendered at build time instead of fetched/parsed in the browser.

## Local dev

```sh
npm install
npm run start      # serves at http://localhost:8080 with live reload
npm run build       # outputs static files to _site/
```

## Deploying

1. Push this repo to GitHub.
2. In the repo's Settings → Pages, set "Source" to **GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` builds and deploys automatically.

## What changed from the old app.js

- **Events, members, sponsors** — all three now come from `src/_data/`
  (`events.csv`, `members.json`, `sponsors.json`) and get rendered into
  HTML at build time by `src/index.njk`, instead of fetched and built
  into the DOM in the browser. Content is now in the page source for
  crawlers, no fetch/render delay.
- **`src/js/site.js`** is what's left of `app.js` — the theme toggle,
  the RSVP-date-prefill click handler, and the two form submissions
  (still POSTing to the same `api.xyzgalaxy.com/contact` endpoint, so
  nothing changes on that end). It's about a third the size of the
  original because it no longer has to fetch/parse the CSV or build any
  DOM — the table, member cards, and sponsor grid are already in the
  HTML by the time this runs.
- **Past-event greying, "Sponsor this week" hiding, and auto-scroll to
  the next event** are still computed client-side on purpose — they're
  relative to the visitor's "today," which build time can't know. The
  full table is pre-rendered either way, so this doesn't affect SEO;
  it's just a small enhancement pass over HTML that already exists.
  Rows carry a `data-date` attribute; any element inside a row that
  should disappear once that date is past is marked `data-past-hide`.
- **Sponsor logo "needs a light background" detection** used to be a
  canvas pixel-scan done in every visitor's browser. It's now a plain
  `needsLightBg` flag you set once per sponsor in `sponsors.json`.
