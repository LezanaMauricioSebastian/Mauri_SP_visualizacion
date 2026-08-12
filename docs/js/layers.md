# js/layers.js

`LayerManager` — load / cache / show / hide lifecycle only. **~494 lines** after the split.

Legend HTML is in [`legends.js`](legends.md). Point-in-polygon counting is in [`spatial.js`](spatial.md). This file delegates to both.

## Globals

- `COUNTING_LAYER_NAMES` = `['Escuelas', 'Comisarias', 'Manzanas_Puntos']`
- `class LayerManager`

## Constructor

```js
new LayerManager(mapManager)
```

State:

| Field | Role |
|-------|------|
| `loadedLayers` | `{ [name]: { layer, geojson, config } }` |
| `geojsonCache` | `{ [city::file]: FeatureCollection }` |
| `inflightFetches` / `inflightLayers` | Promise dedupe |
| `layerGeneration` | Incremented on city clear; cancels stale loads |
| `counts` | `new NeighborhoodCounts({ getGeoJSON, hasDataset })` |
| `legend` | `new LegendManager(mapManager, () => this.loadedLayers)` |

`countingCalculated` is a getter/setter over `this.counts.calculated`.

## Public API (unchanged)

These are the methods [`UIManager`](ui.md) and [`MapUtils`](map.md) rely on:

| Method | Role |
|--------|------|
| `applyNeighborhoodCounts()` | `this.counts.apply()` |
| `hasCountingDataset(layerName)` | City has that layer in config **and** GeoJSON is already cached/loaded |
| `loadLayer(name, config)` | Fetch (+ optional join), create Leaflet layer, store in `loadedLayers`. Returns feature count. Throws `'Layer load cancelled'` if city changed. |
| `addLayerToMap(name)` | `layer.addTo(map)`, `legend.push` + `legend.update`. If name is Barrios, `loadCountingLayers()`. If a counting layer is toggled while Barrios is visible and counts exist, `refreshBarriosLayer()`. |
| `removeLayerFromMap(name)` | Remove from map (unless `hidden`), `legend.drop`. If Barrios, `unloadCountingLayers` + `resetCountingState`. |
| `clearAllLayers()` | `layerGeneration++`, remove all from map, empty caches/inflight, `counts.reset()`, `legend.clear()`. |
| `getFeatureCount(name, config)` | `config.featureCount` if numeric, else `fetchGeoJSON` + `features.length`. |
| `prefetchIdleLayerData()` | Idle-fetch all non-`heavy` files (and `joinFile`s) for the current city. Aborts if city changed. |
| `getLoadedLayers()` | Returns `loadedLayers`. |

## Fetch / cache / join

- `getCacheKey(file, city)` → `` `${city}::${file}` ``
- `fetchGeoJSON(file)` — cache hit, else shared in-flight `fetch(dataPath + file)`. Only writes cache if `generation === layerGeneration`.
- `getLayerGeoJSON(name)` — prefers `loadedLayers[name].geojson`, else cache for that layer’s `file`.
- `joinGeoJSONByProperty(geojson, joinFile, joinProperty)` — left-join extra properties where target is null (VA Población: `LINK`).

## Layer factories

### `createClusteredLayer(geojson, layerConfig, layerName)`

`L.markerClusterGroup`. Each feature: `SpatialUtils.extractLatLng` → `L.marker` with numeric `divIcon` from `valueProperty`. Cluster icon sums child `_clusterValue` (or parses properties); red if total > average, else blue. Popups via `MapUtils.createCustomPopup`.

Used for **Mesas por Escuela** and **Electores por Escuela**.

### `createSchoolLayer(geojson, layerConfig, layerName)`

`L.layerGroup` of `L.circleMarker`s. `SpatialUtils.extractAllLatLngs` (Point and MultiPoint). Style from `MapUtils.getLayerStyle`. Invalid lat/lng skipped.

### `createStandardLayer(geojson, layerConfig, layerName)`

If `layerName === 'Barrios'`, calls `applyNeighborhoodCounts()` first. Then `L.geoJSON` with `onEachFeature` popups + `style: MapUtils.getLayerStyle`. Heavy layers set `renderer: L.canvas({ padding: 0.5 })`.

## Neighborhood counting integration

`isCountingLayer(name)` — membership in `COUNTING_LAYER_NAMES`.

`loadCountingLayers()` (after Barrios is added):

1. `fetchGeoJSON` for each counting name that exists in the current city (missing config is skipped — GR/VA have no Comisarias / Manzanas_Puntos).
2. Abort if generation changed.
3. `hideHiddenLayers()` — ensure `hidden` layers are not on the map.
4. `applyNeighborhoodCounts()` + `refreshBarriosLayer()` + `countingCalculated = true`.

`unloadCountingLayers()` — only deletes **Manzanas_Puntos** from `loadedLayers` (Escuelas / Comisarias stay if the user loaded them).

`refreshBarriosLayer()` — if Barrios is on the map, re-apply counts, remove old layer, `createStandardLayer` again, add back. Needed so polygon styles/popups see new `schoolCount` / etc.

`resetCountingState()` → `this.counts.reset()`.

## Cancellation

Every async path snapshots `const generation = this.layerGeneration` and bails when it diverges. `clearAllLayers` (city switch) is what increments it. UI treats `'Layer load cancelled'` as a non-error.

## Connections

```
UIManager ──load/add/remove/clear──► LayerManager
                                        ├─ fetch ──► datos/{SP|gran_Resis|villa_angela}/
                                        ├─ SpatialUtils.extract* (clusters + schools)
                                        ├─ MapUtils styles/popups
                                        ├─ NeighborhoodCounts.apply
                                        └─ LegendManager.push/update/drop/clear
MapUtils ──window.layerManager──► applyNeighborhoodCounts / hasCountingDataset
```

## Related

- [`spatial.md`](spatial.md) · [`legends.md`](legends.md) · [`map.md`](map.md) · [`config.md`](config.md)
