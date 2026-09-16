# scripts/fetch_negocios_osm.py

Offline Overpass client that downloads commercial POIs from OpenStreetMap and writes one GeoJSON FeatureCollection per city (points only; ways use Overpass `center`).

## Dependencies

- Python 3 stdlib only (`urllib`, `json`)

## Usage

```bash
python3 scripts/fetch_negocios_osm.py
```

Pauses ~8s between cities. Uses `https://overpass-api.de/api/interpreter` with a descriptive User-Agent.

## Query

Within each city’s manzana bbox:

- `shop=*`
- `office=*`
- selected `amenity` values: restaurant, cafe, fast_food, bar, pub, biergarten, ice_cream, food_court, marketplace, pharmacy, bank, atm, fuel, car_wash, cinema, theatre

## Outputs

| City | File |
|------|------|
| SP | `datos/SP/negocios_osm_sp.geojson` |
| GR | `datos/gran_Resis/negocios_osm_amgr.geojson` |
| VA | `datos/villa_angela/negocios_osm_va.geojson` |

Properties: `@id`, `name`, `tipo` (`shop=…` / `amenity=…` / `office=…`), plus the raw tag when present.

## How the app uses the result

- Layer **Negocios** in `CITIES_CONFIG` (group Servicios)
- When **Manzanas** loads, the app fetches this GeoJSON (if needed) and point-in-polygon counts → popup **Negocios (OSM)**

Coverage is incomplete relative to a full commercial register.
