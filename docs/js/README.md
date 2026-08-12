# js/

Vanilla JS modules (global classes / consts, no `import`/`export`). Load order is fixed in [`index.html`](../index.md):

```
config.js → map.js → spatial.js → legends.js → layers.js → ui.js → app.js
```

## Split (current layout)

`LayerManager` used to be a ~926-line monolith. It is now three files **without a public-API change**:

| File | Responsibility |
|------|----------------|
| [`layers.js`](layers.md) (~494 lines) | Fetch / cache / join / create Leaflet layers / show / hide / city cancel |
| [`legends.js`](legends.md) | Legend HTML + stack of last visible layer (`LegendManager`) |
| [`spatial.js`](spatial.md) | Geo helpers + barrio point-in-polygon (`SpatialUtils`, `NeighborhoodCounts`) |

Popups and styles remain in [`map.js`](map.md) (`MapUtils.buildPopupContent`, `getLayerStyle`) and still call:

- `window.layerManager.applyNeighborhoodCounts()`
- `window.layerManager.hasCountingDataset(...)`

Dead centroid / distance / `toRadians` helpers were removed in the split; they are **not** in `spatial.js`.

## Module map

| File | Exports (globals) |
|------|-------------------|
| [`config.js`](config.md) | `CITIES_CONFIG`, `COLOR_PALETTES`, `TRANSLATIONS` |
| [`map.js`](map.md) | `MapManager`, `MapUtils` |
| [`spatial.js`](spatial.md) | `SpatialUtils`, `NeighborhoodCounts` |
| [`legends.js`](legends.md) | `LegendManager` |
| [`layers.js`](layers.md) | `LayerManager`, `COUNTING_LAYER_NAMES` |
| [`ui.js`](ui.md) | `UIManager` |
| [`app.js`](app.md) | `MapApp` (+ sets `window.layerManager`) |

## Typical call chain

1. `MapApp.init` → `MapManager` + `LayerManager` + `UIManager`.
2. UI checkbox → `loadLayer` → `addLayerToMap` → `legend.push` / `legend.update`.
3. Barrios on map → `loadCountingLayers` → `counts.apply()` → popup reads `schoolCount` / `policeCount` / `blockCount`.
4. City change → `clearAllLayers` (`layerGeneration++`) → rebuild panel.

## Related

- [Architecture overview](../README.md)
- [GeoJSON data](../datos/README.md)
