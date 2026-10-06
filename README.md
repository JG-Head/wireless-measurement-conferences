# Wireless measurement conferences

Static planning board for Tier B+ ACM and IEEE venues on **wireless access network measurement** and **end-to-end networking performance**, October 2026 through October 2028.

Maintained for Jorge Garcia-Cabeza (UPM). The page has three views over one JSON file:

- **List** — table or cards, with search, Spain, Europe, status, affinity, and open deadlines in the next 90 days
- **Map** — Leaflet markers (no API key). Spain-hosted events use amber markers. Click a marker for details
- **Timeline** — horizontal strip across the window

Events happening now, upcoming deadlines, and series that are still undated (“Still watching”) stay visible above or below the views.

Live site: <https://jg-head.github.io/wireless-measurement-conferences/>

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

## GitHub Pages

The site is the `/docs` folder on the `main` branch. Pages should use:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/docs**

Expected URL: <https://jg-head.github.io/wireless-measurement-conferences/>

A `.nojekyll` file is included so GitHub serves the JSON and fonts as static files. After a push to `main`, the first deploy can take about a minute. The workflow [`.github/workflows/check-site.yml`](.github/workflows/check-site.yml) checks that the two JSON copies match and that required fields are present. It does not build the site.

If Pages is not enabled yet, open **Settings → Pages**, choose **Deploy from a branch**, then `main` and `/docs`, and save.

## Layout

| Path | Role |
| --- | --- |
| `data/conferences.json` | Source of truth |
| `docs/` | Static site published by GitHub Pages |
| `docs/data/conferences.json` | Copy the site fetches |
| `scripts/validate_conferences.py` | Schema and copy check |

## License

[MIT](LICENSE). Newsreader and Figtree are under the SIL Open Font License (`docs/fonts/*-OFL.txt`).
