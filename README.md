# Wireless measurement conferences

Planning board for Tier B+ ACM and IEEE venues on **wireless access network measurement** and **end-to-end networking performance**, October 2026 through October 2028.

Maintained for Jorge Garcia-Cabeza (UPM). The page is a Vue 3 app with a left sidebar (views and filters) and card-style panels. It has three views over one JSON file:

- **List** — table or cards. The default mode is **Submission opportunities**: a paper or abstract deadline still ahead, or a dated edition whose CFP date is not in the file. Attend-only meetings (closed paper calls) stay in the JSON and appear when that mode is turned off. Other filters: organizer (IEEE, ACM, or Other; multi-select, empty means all), research labs (one chip per cited coauthor cluster), Spain, Europe, status, venue fit, and paper deadlines in the next 90 days. Camera-ready is not treated as a new submission.
- **Map** — Leaflet markers on OpenStreetMap tiles (no API key). Spain-hosted events use the ETSIT orange. **Reset view** fits the markers that match the current filters. Click a marker for details.
- **Timeline** — horizontal strip across the window.

Events happening now, upcoming deadlines, and series that are still undated (“Still watching”) stay visible above or below the views. Filters and the open event are stored in the query string (`?view=map&event=<id>`, `organizer`, `labs`, `submissions=0`, and the rest), so a link opens the same view.

Live Pages URL: <https://jg-head.github.io/wireless-measurement-conferences/>

## Develop and build

The app source is the repo root (`index.html`, `src/`, `public/`, `vite.config.js`). GitHub Pages still publishes `/docs` on `main`, so a production build writes into `docs/` with base path `/wireless-measurement-conferences/`. No repository settings change is required.

```bash
npm install
npm run dev
```

Dev server: <http://localhost:5173/>. It reads `data/conferences.json` and `data/affinity.json` directly.

```bash
npm run build
npm run preview
```

`npm run build` writes the site into `docs/` and copies both JSON files to `docs/data/`. Preview: <http://localhost:4173/wireless-measurement-conferences/>.

Runtime dependencies are free and permissively licensed: Vue (MIT), Bootstrap 5 and Bootstrap Icons (MIT), Leaflet (BSD-2-Clause). Vite is a dev dependency (MIT). The page does not load Highcharts, PrimeVue, or any other paid or dual-licensed library. Map tiles stay OpenStreetMap. Figtree (SIL Open Font License) is the UI face.

The look follows the ETSIT slide language without logos: navy `#002060`, accent orange `#C65F00` for large bold text and bars, and `#B55700` wherever orange text is small or white sits on orange. Tokens and contrast notes are in `src/styles.css`.

## Update the data

`data/conferences.json` is the source of truth. The site fetches `docs/data/conferences.json` at runtime, so a deadline edit does not require changing Vue components. Do not add venues, cities, dates, or deadlines that are not in a source you have checked. Undated series belong in `watching`, not as invented events.

1. Edit `data/conferences.json` and, when the lab list changes, `data/affinity.json`.
2. Copy the JSON into the published site, or rebuild:

   ```bash
   cp data/conferences.json docs/data/conferences.json
   cp data/affinity.json docs/data/affinity.json
   python3 scripts/validate_conferences.py
   ```

   `npm run build` does the same copy after it rebuilds the JavaScript. A data-only change can stop at the copy.

3. Commit the JSON (and `docs/data/` if you copied it) and push to `main`.

Each event needs `id`, `name`, `acronym`, `series`, `start`, `end`, `city`, `country`, `spain` (true only when `country` is Spain), `lat` / `lon` when the city is known, `site`, `cfp`, `deadlines`, `topic_fit`, `standing`, `tier_note`, `status`, `region`, `affinity` (`high`, `medium`, or `low`), and `organizer` (`IEEE`, `ACM`, or `Other`). Optional `organizer_detail` names a joint sponsor when the filter bucket stays with the primary one (NOMS is `IEEE` with detail `IEEE/IFIP`). Optional `notes` is shown as a callout (used for placeholder dates such as SIGMETRICS 2028). Optional `attend_only: true` keeps a dated meeting in the file but hides it from the default submission list (the paper deadline has passed, or no open paper deadline is listed). Deadline keys in use are `abstract`, `paper`, `notification`, and `camera_ready`, as `YYYY-MM-DD`.

Watching entries need `series`, `note`, `organizer`, and `watch_next_edition: true`. Their notes should say the CFP is not open yet. Do not add a dated event just to hold a series.

`data/affinity.json` (copied to `docs/data/affinity.json`) is the research-lab filter. Each unit is one coauthor cluster from the cited-paper analysis. Jorge’s coauthors are listed under `excluded` and must not be added as members. An event or watching row may include `affinity_units`. A series is tagged only when that cluster’s cited venues name it: POMACS is tagged as SIGMETRICS, and PIMRC is tagged for the Ghosh–Rochman symposium papers. Clusters whose outlets are not on this calendar have an empty `series` list. The default list is still submission opportunities; the lab chips narrow that list.

ICC and GLOBECOM stay in the file. WSA, ONDM, and the closed NTC-R 2026 workshop were removed: the first two are a poor topical fit, and NTC-R had no remaining submission date.

## Preview locally

Use `npm run dev` or `npm run preview` (see above). Fetching JSON does not work from a `file://` URL. The map needs a network connection for OpenStreetMap tiles. Leaflet ships with the build, so the list and timeline do not depend on a CDN.

## Dates that are not firm

The JSON is copied through as written. Two editions carry a `notes` field, and the list, map popup, and timeline show that text:

- **SIGMETRICS 2028** (London): city is announced; the mid-June start and end are placeholders. Exact dates are still TBD.
- **EuCNC 2028** (Berlin, 5–9 Jun 2028): dates come from a secondary German tender. The note says to wait for the eucnc.eu 2028 page.

## GitHub Pages

The built site is committed under `/docs` on `main` (`.nojekyll` is included so the JSON and fonts are not passed through Jekyll). Settings stay **Deploy from a branch**, branch `main`, folder `/docs`. The workflow [`.github/workflows/check-site.yml`](.github/workflows/check-site.yml) checks the JSON and that `npm run build` reproduces `docs/`. It does not publish the site. A push to `main` is what updates the live page, usually within a minute.

## Layout

| Path | Role |
| --- | --- |
| `index.html`, `src/` | Vue 3 source |
| `data/conferences.json` | Source of truth for venues |
| `data/affinity.json` | Source of truth for the lab filter |
| `docs/` | Vite build published by GitHub Pages |
| `docs/data/` | JSON the live site fetches |
| `scripts/validate_conferences.py` | Schema and copy check |
| `scripts/copy-data.mjs` | Copies both JSON files into `docs/data/` |

## License

[MIT](LICENSE). Figtree is under the SIL Open Font License (`docs/fonts/Figtree-OFL.txt`).
