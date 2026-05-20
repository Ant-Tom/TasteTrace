#!/usr/bin/env python3
"""Generate V4__seed_kazan_cafes.sql from cafes_kazan.json."""
import hashlib
import json
import re
import sys
from pathlib import Path

KAZAN_LAT, KAZAN_LON = 55.7961, 49.1064
SPREAD = 0.09


def esc(s: str) -> str:
    return s.replace("'", "''")


def coords(name: str, addr: str) -> tuple[float, float]:
    h = hashlib.sha256(f"{name}|{addr}".encode()).hexdigest()
    lat_off = (int(h[:8], 16) / 0xFFFFFFFF - 0.5) * SPREAD
    lon_off = (int(h[8:16], 16) / 0xFFFFFFFF - 0.5) * SPREAD
    return round(KAZAN_LAT + lat_off, 6), round(KAZAN_LON + lon_off, 6)


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "backend/src/main/resources/data/cafes_kazan.json")
    out = Path("backend/src/main/resources/db/migration/V4__seed_kazan_cafes.sql")
    data = json.loads(src.read_text(encoding="utf-8"))

    seen: set[str] = set()
    rows: list[tuple[str, str, str | None, float, float]] = []
    for item in data:
        name = (item.get("name") or "").strip()
        if not name or len(name) < 2:
            continue
        key = re.sub(r"\s+", " ", name.lower())
        if key in seen:
            continue
        seen.add(key)
        street = (item.get("street") or "").strip()
        house = (item.get("house") or "").strip()
        full = (item.get("full_address") or "").strip()
        if not full and street:
            full = f"{street}, {house}".strip(", ")
        category = (item.get("category") or "Кафе").strip()
        lat, lon = coords(name, full or category)
        rows.append((name, category, full or None, lat, lon))

    lines = [
        "-- Kazan cafes from cafes_kazan.json (deduplicated by name)",
        "DELETE FROM reviews;",
        "DELETE FROM establishments;",
        "ALTER TABLE establishments ADD COLUMN IF NOT EXISTS address VARCHAR(512);",
        "",
        "INSERT INTO establishments (name, cuisine, city, latitude, longitude, address) VALUES",
    ]
    values = []
    for name, cat, addr, lat, lon in rows:
        addr_sql = f"'{esc(addr)}'" if addr else "NULL"
        values.append(f"    ('{esc(name)}', '{esc(cat)}', 'Казань', {lat}, {lon}, {addr_sql})")
    lines.append(",\n".join(values))
    lines.append(";")
    lines.append("")
    lines.append(
        "SELECT setval('establishments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM establishments));"
    )
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} establishments to {out}")


if __name__ == "__main__":
    main()
