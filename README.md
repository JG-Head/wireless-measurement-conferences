# Wireless measurement conferences

Static planning board for Tier B+ ACM and IEEE venues on **wireless access network measurement** and **end-to-end networking performance**, October 2026 through October 2028.

Maintained for Jorge Garcia-Cabeza (UPM). The page has three views over one JSON file:

- **List** — table or cards. The default mode is **Submission opportunities**: a paper or abstract deadline still ahead, or a dated edition whose CFP date is not in the file. Attend-only meetings (closed paper calls) stay in the JSON and appear when that mode is turned off. Other filters: Spain, Europe, status, affinity, and paper deadlines in the next 90 days. Camera-ready is not treated as a new submission.
- **Map** — Leaflet markers (no API key). Spain-hosted events use amber markers. Click a marker for details
- **Timeline** — horizontal strip across the window

Events happening now, upcoming deadlines, and series that are still undated (“Still watching”) stay visible above or below the views.

Live Pages URL: <https://jg-head.github.io/wireless-measurement-conferences/>

## Update the data

`data/conferences.json` is the source of truth. The site reads the copy at `docs/data/conferences.json`. Do not add venues, cities, dates, or deadlines that are not in a source you have checked. Undated series belong in `watching`, not as invented events.

1. Edit `data/conferences.json`.
2. Copy it into the site:

   ```bash
   cp data/conferences.json docs/data/conferences.json
   python3 scripts/validate_conferences.py
   ```

3. Commit both files and push to `main`.

Each event needs `id`, `name`, `acronym`, `series`, `start`, `end`, `city`, `country`, `spain` (true only when `country` is Spain), `lat` / `lon` when the city is known, `site`, `cfp`, `deadlines`, `topic_fit`, `standing`, `tier_note`, `status`, `region`, and `affinity` (`high`, `medium`, or `low`). Optional `notes` is shown as a callout (used for placeholder dates such as SIGMETRICS 2028). Optional `attend_only: true` keeps a dated meeting in the file but hides it from the default submission list (the paper deadline has passed, or no open paper deadline is listed). Deadline keys in use are `abstract`, `paper`, `notification`, and `camera_ready`, as `YYYY-MM-DD`.

Watching entries need `series`, `note`, and `watch_next_edition: true`. Their notes should say the CFP is not open yet. Do not add a dated event just to hold a series.

ICC and GLOBECOM stay in the file. WSA, ONDM, and the closed NTC-R 2026 workshop were removed: the first two are a poor topical fit, and NTC-R had no remaining submission date.

## Preview locally

Fetching JSON does not work from a `file://` URL. Serve the site directory:

```bash
python3 -m http.server -d docs 8080
```

Open <http://localhost:8080>. List and timeline render from the JSON with no network. The map needs Leaflet from cdnjs and OpenStreetMap tiles, which do not use an API key.

## Dates that are not firm

The JSON is copied through as written. Two editions carry a `notes` field, and the list, map popup, and timeline show that text:

- **SIGMETRICS 2028** (London): city is announced; the mid-June start and end are placeholders. Exact dates are still TBD.
- **EuCNC 2028** (Berlin, 5–9 Jun 2028): dates come from a secondary German tender. The note says to wait for the eucnc.eu 2028 page.

## GitHub Pages

The files to publish are in `/docs` on `main` (`.nojekyll` is included so the JSON and fonts are not passed through Jekyll).

The site is published from `/docs` on `main`: <https://jg-head.github.io/wireless-measurement-conferences/>

Settings: **Deploy from a branch**, branch `main`, folder `/docs`. The workflow [`.github/workflows/check-site.yml`](.github/workflows/check-site.yml) checks that the two JSON copies match. It does not publish the site. A push to `main` is what updates the live page, usually within a minute.

## Layout

| Path | Role |
| --- | --- |
| `data/conferences.json` | Source of truth |
| `docs/` | Static site published by GitHub Pages |
| `docs/data/conferences.json` | Copy the site fetches |
| `scripts/validate_conferences.py` | Schema and copy check |

## License

[MIT](LICENSE). Newsreader and Figtree are under the SIL Open Font License (`docs/fonts/*-OFL.txt`).
