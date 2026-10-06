#!/usr/bin/env python3
"""Check conference data shape and that the published copy matches."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "conferences.json"
PUBLISHED = ROOT / "docs" / "data" / "conferences.json"
REQUIRED = [
    "id", "name", "acronym", "series", "start", "end", "city", "country",
    "spain", "site", "cfp", "deadlines", "topic_fit", "standing", "tier_note",
    "status", "region", "affinity",
]
AFFINITY = {"high", "medium", "low"}


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    return 1


def is_iso_date(value):
    if not isinstance(value, str) or len(value) != 10:
        return False
    year, month, day = value.split("-")
    return year.isdigit() and month.isdigit() and day.isdigit()


def main():
    raw_source = SOURCE.read_bytes()
    raw_published = PUBLISHED.read_bytes()
    if raw_source != raw_published:
        return fail("docs/data/conferences.json differs from data/conferences.json")

    data = json.loads(raw_source)
    errors = []
    if not is_iso_date(data.get("verified_as_of", "")):
        errors.append("verified_as_of must be YYYY-MM-DD")
    window = data.get("window") or {}
    if not is_iso_date(window.get("from", "")) or not is_iso_date(window.get("to", "")):
        errors.append("window.from and window.to must be YYYY-MM-DD")
    if not data.get("owner", {}).get("name"):
        errors.append("owner.name is required")

    events = data.get("events")
    if not isinstance(events, list) or not events:
        errors.append("events must be a non-empty list")
        events = []

    seen = set()
    for event in events:
        ident = event.get("id", "<missing id>")
        for key in REQUIRED:
            if key not in event:
                errors.append(f"{ident} missing {key}")
        if ident in seen:
            errors.append(f"duplicate id {ident}")
        seen.add(ident)
        for key in ("start", "end"):
            if not is_iso_date(event.get(key, "")):
                errors.append(f"{ident} {key} must be YYYY-MM-DD")
        if event.get("affinity") not in AFFINITY:
            errors.append(f"{ident} affinity must be high, medium, or low")
        spain = event.get("spain")
        if not isinstance(spain, bool):
            errors.append(f"{ident} spain must be boolean")
        elif spain != (event.get("country") == "Spain"):
            errors.append(f"{ident} spain flag does not match country")
        lat, lon = event.get("lat"), event.get("lon")
        if lat is not None or lon is not None:
            if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
                errors.append(f"{ident} lat/lon must be numbers")
            elif not (-90 <= lat <= 90 and -180 <= lon <= 180):
                errors.append(f"{ident} lat/lon out of range")
        deadlines = event.get("deadlines")
        if not isinstance(deadlines, dict):
            errors.append(f"{ident} deadlines must be an object")
        else:
            for name, value in deadlines.items():
                if not is_iso_date(value):
                    errors.append(f"{ident} deadline {name} must be YYYY-MM-DD")

    for item in data.get("watching") or []:
        if not item.get("series") or not item.get("note"):
            errors.append(f"watching entry needs series and note: {item!r}")

    if errors:
        for message in errors:
            print(f"error: {message}", file=sys.stderr)
        return 1

    print(f"ok: {len(events)} events, {len(data.get('watching') or [])} watching")
    return 0


if __name__ == "__main__":
    sys.exit(main())
