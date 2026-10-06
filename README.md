# Wireless measurement conferences

Static planning board for Tier B+ ACM and IEEE venues on **wireless access network measurement** and **end-to-end networking performance**, October 2026 through October 2028.

Maintained for Jorge Garcia-Cabeza (UPM). The page has three views over one JSON file:

- **List** — table or cards, with search, Spain, Europe, status, affinity, and open deadlines in the next 90 days
- **Map** — Leaflet markers (no API key). Spain-hosted events use amber markers. Click a marker for details
- **Timeline** — horizontal strip across the window

Events happening now, upcoming deadlines, and series that are still undated (“Still watching”) stay visible above or below the views.

Expected Pages URL, once an admin enables it: <https://jg-head.github.io/wireless-measurement-conferences/>

## Update the data

`data/conferences.json` is the source of truth. The site reads the copy at `docs/data/conferences.json`. Do not add venues, cities, dates, or deadlines that are not in a source you have checked. Undated series belong in `watching`, not as invented events.

1. Edit `data/conferences.json`.
2. Copy it into the site:

   ```bash
   cp data/conferences.json docs/data/conferences.json
   python3 scripts/validate_conferences.py
   ```

3. Commit both files and push to `main`.

Each event needs `id`, `name`, `acronym`, `series`, `start`, `end`, `city`, `country`, `spain` (true only when `country` is Spain), `lat` / `lon` when the city is known, `site`, `cfp`, `deadlines`, `topic_fit`, `standing`, `tier_note`, `status`, `region`, and `affinity` (`high`, `medium`, or `low`). Optional `notes` is shown as a callout (used for placeholder dates such as SIGMETRICS 2028). Deadline keys in use are `abstract`, `paper`, `notification`, and `camera_ready`, as `YYYY-MM-DD`.

## Preview locally

Fetching JSON does not work from a `file://` URL. Serve the site directory:

```bash
python3 -m http.server -d docs 8080
```

Open <http://localhost:8080>. List and timeline render from the JSON with no network. The map needs Leaflet from cdnjs and CARTO/OpenStreetMap tiles.

## Dates that are not firm

The JSON is copied through as written. Two editions carry a `notes` field, and the list, map popup, and timeline show that text:

- **SIGMETRICS 2028** (London): city is announced; the mid-June start and end are placeholders. Exact dates are still TBD.
- **EuCNC 2028** (Berlin, 5–9 Jun 2028): dates come from a secondary German tender. The note says to wait for the eucnc.eu 2028 page.

## GitHub Pages

The files to publish are in `/docs` on `main` (`.nojekyll` is included so the JSON and fonts are not passed through Jekyll).

Expected URL: <https://jg-head.github.io/wireless-measurement-conferences/>

That URL was still **404** on 6 Oct 2026. Creating the Pages site needs repository **administration** (`administration: write` and `pages: write`). `POST /repos/JG-Head/wireless-measurement-conferences/pages` returns 403 for the available GitHub App token, and `actions/configure-pages` cannot enable a site with the default `GITHUB_TOKEN`. An owner turns it on once:

1. **Settings → Pages**
2. **Build and deployment → Source:** Deploy from a branch
3. **Branch:** `main`, **folder:** `/docs`
4. Save

The first deploy usually takes about a minute. The workflow [`.github/workflows/check-site.yml`](.github/workflows/check-site.yml) checks that the two JSON copies match. It does not publish the site.

## Layout

| Path | Role |
| --- | --- |
| `data/conferences.json` | Source of truth |
| `docs/` | Static site published by GitHub Pages |
| `docs/data/conferences.json` | Copy the site fetches |
| `scripts/validate_conferences.py` | Schema and copy check |

## License

[MIT](LICENSE). Newsreader and Figtree are under the SIL Open Font License (`docs/fonts/*-OFL.txt`).
