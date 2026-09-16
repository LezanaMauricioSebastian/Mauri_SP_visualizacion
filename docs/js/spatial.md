# js/spatial.js

Spatial helpers and point-in-polygon counts. Two barrio-oriented globals plus manzana business counts:

- `SpatialUtils` — pure geo functions
- `NeighborhoodCounts` — cached school / police / block counts per barrio
- `ManzanaBusinessCounts` — cached OSM business counts per manzana

No centroid, distance, or `toRadians` helpers (removed in the split).

## `SpatialUtils`

Coordinates are stored in GeoJSON as `[lng, lat]` and converted to Leaflet `[lat, lng]`.

### `extractLatLng(geometry)`

First valid point from `extractAllLatLngs`, or `null`. Used by clustered Mesas/Electores markers.

### `extractAllLatLngs(geometry)`

| Geometry | Result |
|----------|--------|
| `Point` | one `[lat, lng]` if finite numbers |
| `MultiPoint` | all valid points |
| anything else / missing | `[]` |

Used by school/negocio circle markers and by counting (each MultiPoint child is counted separately).

### `ringToLatLng(ring)`

Maps a GeoJSON ring (`[lng, lat][]`) to `{ coords: [lat, lng][], minLat, maxLat, minLng, maxLng }` for bbox culling.

### `isPointInPolygon(point, polygon)`

Ray-casting. `point` and `polygon` vertices are `[lat, lng]` (same axis order as `ringToLatLng`).

### `buildPolygonIndex(geo, keyFn)`

Generic polygon index. One entry per feature: `{ key: keyFn(properties), rings: [...] }`. Supports `Polygon` / `MultiPolygon` with holes.

### `buildNeighborhoodIndex(geo)` / `buildManzanaIndex(geo)`

Wrappers using `MapUtils.getNeighborhoodKey` and `MapUtils.getManzanaKey` (`M0046-ID` / `PDLFRM` / `DFRM`).

### `countPointsInPolygons(features, index)` / `countPointsInNeighborhoods(...)`

For each point of each feature, walk polygons **from last to first** (last overlapping wins). Bbox reject, then outer ring, skip holes. Returns `{ [key]: number }` or `null`.

## `NeighborhoodCounts`

Constructed by [`LayerManager`](layers.md):

```js
new NeighborhoodCounts({
  getGeoJSON: (name) => this.getLayerGeoJSON(name),
  hasDataset: (name) => this.hasCountingDataset(name)
})
```

### State

- `calculated` — boolean; `LayerManager` exposes it as `countingCalculated`
- `cache` — `{ schools, police, blocks }` count maps (or `null`)
- `index` — result of `buildNeighborhoodIndex(Barrios)` (lazy)

### Methods

| Method | Behavior |
|--------|----------|
| `reset()` | `calculated = false`, empty cache, `index = null` |
| `getIndex()` | Build/cache neighborhood index from Barrios GeoJSON |
| `countSchoolsPerNeighborhood()` | Cache `countPointsInNeighborhoods(Escuelas, index)` |
| `countPoliceStationsPerNeighborhood()` | Same for **Comisarias** |
| `countBlocksPerNeighborhood()` | Same for **Manzanas_Puntos** |
| `apply()` | Write `schoolCount` / `policeCount` / `blockCount` onto barrio features |

## `ManzanaBusinessCounts`

Same inject pattern as `NeighborhoodCounts`. When **Manzanas** loads, `LayerManager.ensureManzanaBusinessData()` fetches **Negocios** GeoJSON, then `apply()` writes `negocioCount` onto each manzana feature. Popup label: **Negocios (OSM)**.

| Method | Behavior |
|--------|----------|
| `reset()` | Clear cache + manzana index |
| `countBusinessesPerManzana()` | `countPointsInPolygons(Negocios, manzanaIndex)` |
| `apply()` | Set `feature.properties.negocioCount` |

## Who calls what

- `LayerManager.createClusteredLayer` / `createSchoolLayer` → `extractLatLng` / `extractAllLatLngs`
- `LayerManager.applyNeighborhoodCounts` → `counts.apply()`
- `LayerManager.applyManzanaBusinessCounts` → `manzanaBusiness.apply()`
- `MapUtils.buildPopupContent` (Barrios / Manzanas) → apply then read properties
- City switch / Barrios off → `resetCountingState()` (both counters)

## City coverage

| Dataset | `sp` | `gr` | `va` |
|---------|------|------|------|
| Barrios polygons | yes | yes | no layer |
| Escuelas points | catalog | enriched mesas | enriched mesas (unused for counts; no Barrios) |
| Comisarias | yes | no | no |
| Manzanas_Puntos | hidden layer | no | no |
| Negocios (OSM) | yes | yes | yes |
| Manzanas → negocioCount | yes | yes | yes |

## Related

- [`layers.md`](layers.md) — lifecycle that loads counting GeoJSON
- [`map.md`](map.md) — popups that display the counts
- [`config.md`](config.md) — which cities define those layer names
- [`../scripts/fetch_negocios_osm.md`](../scripts/fetch_negocios_osm.md) — Overpass refresh
