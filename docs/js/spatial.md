# js/spatial.js

Spatial helpers and barrio point-in-polygon counts. ~238 lines.

Two globals:

- `SpatialUtils` — pure geo functions
- `NeighborhoodCounts` — cached school / police / block counts per barrio

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

Used by school circle markers and by counting (each MultiPoint child is counted separately).

### `ringToLatLng(ring)`

Maps a GeoJSON ring (`[lng, lat][]`) to `{ coords: [lat, lng][], minLat, maxLat, minLng, maxLng }` for bbox culling.

### `isPointInPolygon(point, polygon)`

Ray-casting. `point` and `polygon` vertices are `[lat, lng]` (same axis order as `ringToLatLng`).

### `buildNeighborhoodIndex(geo)`

From Barrios `FeatureCollection`, one index entry per feature:

```
{ key: MapUtils.getNeighborhoodKey(properties), rings: [{ coords, min*, max*, holes }] }
```

Supports `Polygon` and `MultiPolygon`. Outer ring + hole rings. `key` matches popup/style identity.

### `countPointsInNeighborhoods(features, index)`

For each point of each feature, walk neighborhoods **from last to first** (last overlapping barrio wins). Bbox reject, then `isPointInPolygon` on outer ring, skip if inside a hole. Increments `counts[key]`. Returns `{ [neighborhoodKey]: number }` or `null` if index/features missing.

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
| `countSchoolsPerNeighborhood()` | Cache `SpatialUtils.countPointsInNeighborhoods(Escuelas, index)` |
| `countPoliceStationsPerNeighborhood()` | Same for **Comisarias** |
| `countBlocksPerNeighborhood()` | Same for **Manzanas_Puntos** |
| `apply()` | If Barrios GeoJSON exists and at least one counting dataset is present, write `schoolCount` / `policeCount` / `blockCount` onto each barrio `feature.properties` (0 if key missing) |

`apply()` does not require Escuelas/Comisarias to be **visible** — only that their GeoJSON is available (`hasDataset` / `getGeoJSON`). That is why Barrios-only can still show `Escuelas en el barrio: 0` after `loadCountingLayers` has fetched the files.

## Who calls what

- `LayerManager.createClusteredLayer` / `createSchoolLayer` → `extractLatLng` / `extractAllLatLngs`
- `LayerManager.applyNeighborhoodCounts` → `counts.apply()`
- `MapUtils.buildPopupContent` / `getLayerStyle` (Barrios) → `window.layerManager.applyNeighborhoodCounts()` then read properties
- City switch / Barrios off → `counts.reset()`

## City coverage

| Dataset | `sp` | `gr` | `va` |
|---------|------|------|------|
| Barrios polygons | yes | yes | no layer |
| Escuelas points | catalog | enriched mesas | enriched mesas (unused for counts; no Barrios) |
| Comisarias | yes | no | no |
| Manzanas_Puntos | hidden layer | no | no |

## Related

- [`layers.md`](layers.md) — lifecycle that loads counting GeoJSON
- [`map.md`](map.md) — popups that display the counts
- [`config.md`](config.md) — which cities define those layer names
