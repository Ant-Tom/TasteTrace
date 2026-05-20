#!/usr/bin/env python3
"""Geocode Kazan cafes via Photon (OSM); cache results and emit Flyway V5 SQL."""
from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.request
from urllib.parse import quote
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "backend/src/main/resources/data/cafes_kazan.json"
CACHE = ROOT / "backend/src/main/resources/data/geocode_cache.json"
OUT = ROOT / "backend/src/main/resources/db/migration/V5__geocode_establishments.sql"

KAZAN_LAT, KAZAN_LON = 55.7961, 49.1064
SPREAD = 0.09
USER_AGENT = "TasteTrace/1.0"
DELAY_SEC = 0.4
PHOTON = "https://photon.komoot.io/api/"


def hash_coords(name: str, addr: str) -> tuple[float, float]:
    h = hashlib.sha256(f"{name}|{addr}".encode()).hexdigest()
    lat_off = (int(h[:8], 16) / 0xFFFFFFFF - 0.5) * SPREAD
    lon_off = (int(h[8:16], 16) / 0xFFFFFFFF - 0.5) * SPREAD
    return round(KAZAN_LAT + lat_off, 6), round(KAZAN_LON + lon_off, 6)


def usable_address(item: dict) -> str | None:
    street = (item.get("street") or "").strip()
    house = (item.get("house") or "").strip()
    full = (item.get("full_address") or "").strip()
    if not full and street:
        full = f"{street}, {house}".strip(", ")
    if len(full) < 6 or full.isdigit():
        return None
    if not street and len(full) < 10:
        return None
    return full


def geocode_photon(query: str, cache: dict) -> tuple[float, float] | None:
    key = query.lower()
    if key in cache:
        hit = cache[key]
        return (hit["lat"], hit["lon"]) if hit else None

    url = f"{PHOTON}?q={quote(query)}&limit=1"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        features = data.get("features") or []
        if not features:
            cache[key] = None
            return None
        lon, lat = features[0]["geometry"]["coordinates"]
        # Kazan bbox sanity check
        if not (55.65 <= lat <= 55.95 and 48.85 <= lon <= 49.45):
            cache[key] = None
            return None
        result = {"lat": round(lat, 6), "lon": round(lon, 6)}
        cache[key] = result
        return result["lat"], result["lon"]
    except Exception as exc:
        print(f"  fail: {query[:65]} ({exc})")
        cache[key] = None
        return None


def load_rows() -> list[dict]:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    seen: set[str] = set()
    rows: list[dict] = []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name or len(name) < 2:
            continue
        key = re.sub(r"\s+", " ", name.lower())
        if key in seen:
            continue
        seen.add(key)
        addr = usable_address(item)
        category = (item.get("category") or "Кафе").strip()
        rows.append({"name": name, "category": category, "address": addr})
    return rows


def main() -> None:
    cache: dict = {}
    if CACHE.exists():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))
        # drop failed nominatim null-only cache for retry
        cache = {k: v for k, v in cache.items() if v is not None}

    rows = load_rows()
    photon_hits = 0

    for i, row in enumerate(rows, start=1):
        name = row["name"]
        addr = row["address"]
        fallback = hash_coords(name, addr or row["category"])

        if addr:
            query = f"{addr}, Казань"
            if query.lower() not in cache:
                print(f"[{i}/{len(rows)}] {query[:70]}")
                time.sleep(DELAY_SEC)
            hit = geocode_photon(query, cache)
            if hit:
                row["lat"], row["lon"] = hit
                row["source"] = "photon"
                photon_hits += 1
                continue

        row["lat"], row["lon"] = fallback
        row["source"] = "hash"

    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    updates = [
        "-- Precise coordinates via Photon OSM geocoder where address exists\n",
        *[(
            f"UPDATE establishments SET latitude = {r['lat']}, longitude = {r['lon']} "
            f"WHERE id = {idx};"
        ) for idx, r in enumerate(rows, start=1)],
        "",
    ]
    OUT.write_text("\n".join(updates), encoding="utf-8")
    print(f"Total: {len(rows)}, Photon: {photon_hits}, hash fallback: {len(rows) - photon_hits}")
    print(f"Cache: {CACHE}")
    print(f"SQL: {OUT}")


if __name__ == "__main__":
    main()
