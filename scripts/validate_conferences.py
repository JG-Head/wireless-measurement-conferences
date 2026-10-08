#!/usr/bin/env python3
"""Check conference data shape and that the published copy matches."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "conferences.json"
PUBLISHED = ROOT / "docs" / "data" / "conferences.json"
AFFINITY_SOURCE = ROOT / "data" / "affinity.json"
AFFINITY_PUBLISHED = ROOT / "docs" / "data" / "affinity.json"
THEMES = {"Starlink", "CBRS", "cell-load", "crowdsource", "LEO"}
BANNED_MEMBERS = ("frias", "mendo", "lehr", "yraola", "garcia-cabeza", "garcia cabeza")
REQUIRED = [
    "id", "name", "acronym", "series", "start", "end", "city", "country",
    "spain", "site", "cfp", "deadlines", "topic_fit", "standing", "tier_note",
    "status", "region", "affinity", "organizer",
]
AFFINITY = {"high", "medium", "low"}
ORGANIZER = {"IEEE", "ACM", "Other"}
# Filter bucket. Joint sponsors stay in one bucket; organizer_detail can name the pair.
ORGANIZER_BY_SERIES = {
    "ICC": "IEEE",
    "GLOBECOM": "IEEE",
    "INFOCOM": "IEEE",
    "WCNC": "IEEE",
    "PIMRC": "IEEE",
    "VTC": "IEEE",
    "NOMS": "IEEE",
    "CNSM": "IEEE",
    "DySPAN": "IEEE",
    "IMC": "ACM",
    "SIGMETRICS": "ACM",
    "CoNEXT": "ACM",
    "HotNets": "ACM",
    "WWW": "ACM",
    "MobiCom": "ACM",
    "TPRC": "Other",
    "PAM": "Other",
    "TMA": "Other",
    "IFIP Networking": "Other",
    "EuCNC": "Other",
}


def fail(message):
    print(f"error: {message}", file=sys.stderr)
    return 1


def is_iso_date(value):
    if not isinstance(value, str) or len(value) != 10:
        return False
    year, month, day = value.split("-")
    return year.isdigit() and month.isdigit() and day.isdigit()


def load_affinity(errors):
    if not AFFINITY_SOURCE.exists() or not AFFINITY_PUBLISHED.exists():
        errors.append("data/affinity.json and docs/data/affinity.json are required")
        return None
    raw_source = AFFINITY_SOURCE.read_bytes()
    if raw_source != AFFINITY_PUBLISHED.read_bytes():
        errors.append("docs/data/affinity.json differs from data/affinity.json")
        return None
    affinity = json.loads(raw_source)
    units = affinity.get("units")
    if not isinstance(units, list) or not units:
        errors.append("affinity units must be a non-empty list")
        return None
    seen = set()
    for unit in units:
        ident = unit.get("id", "<missing id>")
        if ident in seen:
            errors.append(f"duplicate affinity unit {ident}")
        seen.add(ident)
        if not isinstance(ident, str) or not ident.replace("-", "").isalnum() or ident != ident.lower():
            errors.append(f"affinity id must be a lowercase slug: {ident}")
        if unit.get("tier") not in {"core", "secondary"}:
            errors.append(f"{ident} tier must be core or secondary")
        members = unit.get("members")
        if not isinstance(members, list) or not members:
            errors.append(f"{ident} members must be a non-empty list")
            members = []
        contact = unit.get("contact")
        if not isinstance(contact, str) or contact not in members:
            errors.append(f"{ident} contact must be one of members")
        for member in members:
            folded = str(member).lower()
            if any(token in folded for token in BANNED_MEMBERS):
                errors.append(f"{ident} member is excluded from affinity: {member}")
        themes = unit.get("themes")
        if not isinstance(themes, list) or not themes or any(theme not in THEMES for theme in themes):
            errors.append(f"{ident} themes must use {sorted(THEMES)}")
        series = unit.get("series")
        if not isinstance(series, list) or any(not isinstance(item, str) or not item for item in series):
            errors.append(f"{ident} series must be a list of names")
        if not isinstance(unit.get("link"), str) or not unit.get("link"):
            errors.append(f"{ident} link note is required")
        if not unit.get("name"):
            errors.append(f"{ident} name is required")
    return affinity


def check_organizer(record, ident, errors):
    series = record.get("series")
    organizer = record.get("organizer")
    expected = ORGANIZER_BY_SERIES.get(series)
    if organizer not in ORGANIZER:
        errors.append(f"{ident} organizer must be IEEE, ACM, or Other")
    elif expected and organizer != expected:
        errors.append(f"{ident} organizer {organizer} != {expected} for {series}")
    elif series and expected is None:
        errors.append(f"{ident} series {series} has no organizer bucket")
    detail = record.get("organizer_detail")
    if detail is not None and (not isinstance(detail, str) or not detail.strip()):
        errors.append(f"{ident} organizer_detail must be non-empty text")


def check_affinity_tags(record, ident, units_by_id, errors):
    tags = record.get("affinity_units", [])
    if tags is None:
        return
    if not isinstance(tags, list):
        errors.append(f"{ident} affinity_units must be a list")
        return
    series = record.get("series")
    expected = [unit["id"] for unit in units_by_id.values() if series in unit.get("series", [])]
    if tags != expected:
        errors.append(f"{ident} affinity_units {tags} != series tags {expected}")
    for tag in tags:
        if tag not in units_by_id:
            errors.append(f"{ident} unknown affinity unit {tag}")


def main():
    raw_source = SOURCE.read_bytes()
    raw_published = PUBLISHED.read_bytes()
    if raw_source != raw_published:
        return fail("docs/data/conferences.json differs from data/conferences.json")

    data = json.loads(raw_source)
    errors = []
    affinity = load_affinity(errors)
    units_by_id = {unit["id"]: unit for unit in (affinity or {}).get("units", []) if unit.get("id")}
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
        if "attend_only" in event and not isinstance(event.get("attend_only"), bool):
            errors.append(f"{ident} attend_only must be boolean")
        deadlines = event.get("deadlines")
        if not isinstance(deadlines, dict):
            errors.append(f"{ident} deadlines must be an object")
        else:
            for name, value in deadlines.items():
                if not is_iso_date(value):
                    errors.append(f"{ident} deadline {name} must be YYYY-MM-DD")
            if event.get("attend_only") is True:
                today = data.get("verified_as_of", "")
                for name in ("abstract", "paper"):
                    value = deadlines.get(name)
                    if value and value >= today:
                        errors.append(f"{ident} attend_only but {name} {value} is still open")
        check_organizer(event, ident, errors)
        if units_by_id:
            check_affinity_tags(event, ident, units_by_id, errors)

    for item in data.get("watching") or []:
        if not item.get("series") or not item.get("note"):
            errors.append(f"watching entry needs series and note: {item!r}")
        if item.get("watch_next_edition") is not True:
            errors.append(f"watching {item.get('series')} needs watch_next_edition true")
        check_organizer(item, f"watching {item.get('series')}", errors)
        if units_by_id:
            check_affinity_tags(item, f"watching {item.get('series')}", units_by_id, errors)

    if errors:
        for message in errors:
            print(f"error: {message}", file=sys.stderr)
        return 1

    print(f"ok: {len(events)} events, {len(data.get('watching') or [])} watching")
    return 0


if __name__ == "__main__":
    sys.exit(main())
