#!/usr/bin/env python3
"""Fetch commercial POIs from OSM Overpass and write GeoJSON per city."""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "Mauri_SP/1.0 (fetch_negocios_osm.py; educational map; contact: local)"
PAUSE_SECONDS = 8

# south, west, north, east — from manzana layer extents
CITIES = {
    "sp": {
        "bbox": (-26.8298, -60.4788, -26.7446, -60.3957),
        "out": ROOT / "datos" / "SP" / "negocios_osm_sp.geojson",
    },
    "gr": {
        "bbox": (-27.5714, -59.0745, -27.3675, -58.8806),
        "out": ROOT / "datos" / "gran_Resis" / "negocios_osm_amgr.geojson",
    },
    "va": {
        "bbox": (-27.6064, -60.7542, -27.5511, -60.6872),
        "out": ROOT / "datos" / "villa_angela" / "negocios_osm_va.geojson",
    },
}

AMENITY_REGEX = (
    "restaurant|cafe|fast_food|bar|pub|biergarten|ice_cream|food_court|"
    "marketplace|pharmacy|bank|atm|fuel|car_wash|cinema|theatre"
)


def build_query(south: float, west: float, north: float, east: float) -> str:
    bbox = f"{south},{west},{north},{east}"
    return f"""
[out:json][timeout:120];
(
  node["shop"]({bbox});
  way["shop"]({bbox});
  node["office"]({bbox});
  way["office"]({bbox});
  node["amenity"~"^({AMENITY_REGEX})$"]({bbox});
  way["amenity"~"^({AMENITY_REGEX})$"]({bbox});
);
out center tags;
""".strip()


def fetch_overpass(query: str) -> dict:
    encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")
    req = urllib.request.Request(
        OVERPASS_URL,
        data=encoded,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent": USER_AGENT,
        },
    )
    with urllib.request.urlopen(req, timeout=180) as resp:
        return json.loads(resp.read().decode("utf-8"))


def element_point(el: dict) -> tuple[float, float] | None:
    if el.get("type") == "node":
        lat, lon = el.get("lat"), el.get("lon")
        if lat is None or lon is None:
            return None
        return float(lon), float(lat)
    center = el.get("center") or {}
    lat, lon = center.get("lat"), center.get("lon")
    if lat is None or lon is None:
        return None
    return float(lon), float(lat)


def tipo_from_tags(tags: dict) -> str:
    if tags.get("shop"):
        return f"shop={tags['shop']}"
    if tags.get("amenity"):
        return f"amenity={tags['amenity']}"
    if tags.get("office"):
        return f"office={tags['office']}"
    return "desconocido"


def elements_to_geojson(elements: list[dict], timestamp: str | None) -> dict:
    features = []
    seen = set()
    for el in elements:
        el_id = f"{el.get('type')}/{el.get('id')}"
        if el_id in seen:
            continue
        seen.add(el_id)
        point = element_point(el)
        if not point:
            continue
        tags = el.get("tags") or {}
        lon, lat = point
        props = {
            "@id": el_id,
            "name": tags.get("name") or "",
            "tipo": tipo_from_tags(tags),
        }
        for key in ("shop", "amenity", "office"):
            if tags.get(key):
                props[key] = tags[key]
        features.append(
            {
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                "id": el_id,
            }
        )

    return {
        "type": "FeatureCollection",
        "generator": "overpass-api / fetch_negocios_osm.py",
        "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL.",
        "timestamp": timestamp or "",
        "features": features,
    }


def fetch_city(key: str, cfg: dict) -> int:
    south, west, north, east = cfg["bbox"]
    query = build_query(south, west, north, east)
    print(f"[{key}] Overpass bbox={cfg['bbox']} …")
    try:
        payload = fetch_overpass(query)
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")[:400]
        raise SystemExit(f"[{key}] Overpass HTTP {err.code}: {detail}") from err
    except urllib.error.URLError as err:
        raise SystemExit(f"[{key}] Overpass network error: {err}") from err

    geo = elements_to_geojson(payload.get("elements") or [], payload.get("osm3s", {}).get("timestamp_osm_base"))
    out_path: Path = cfg["out"]
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(geo, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write("\n")
    n = len(geo["features"])
    print(f"[{key}] wrote {n} features → {out_path.relative_to(ROOT)}")
    return n


def main() -> None:
    totals = {}
    for i, (key, cfg) in enumerate(CITIES.items()):
        if i:
            print(f"pausing {PAUSE_SECONDS}s …")
            time.sleep(PAUSE_SECONDS)
        totals[key] = fetch_city(key, cfg)
    print("done:", totals)


if __name__ == "__main__":
    main()
