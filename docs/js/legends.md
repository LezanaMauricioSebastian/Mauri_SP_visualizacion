# js/legends.js

`LegendManager` — legend HTML and the stack of the last visible overlay. ~211 lines.

Created by [`LayerManager`](layers.md):

```js
this.legend = new LegendManager(mapManager, () => this.loadedLayers);
```

The second argument is a getter so the legend always sees the current `loadedLayers` object (including after Barrios refresh replaces the Leaflet layer).

## Constructor state

| Field | Role |
|-------|------|
| `mapManager` | City + `getMap()` for `L.control` |
| `getLoadedLayers` | Snapshot of loaded overlay data |
| `currentLegend` | Active Leaflet control, or `null` |
| `legendStack` | Visible layer names, last = currently shown legend |

## API

| Method | Behavior |
|--------|----------|
| `update(layerName)` | Remove current control; if layer is loaded, add a new `L.control({ position: 'bottomright' })` with class `legend`. |
| `remove()` | `map.removeControl(currentLegend)` if any. |
| `push(layerName)` | Move `layerName` to the top of the stack (deduped). Called from `addLayerToMap`. |
| `drop(layerName)` | Remove from stack, then `restoreTop()`. Called from `removeLayerFromMap`. |
| `restoreTop()` | Walk stack from the end; show legend for the last non-hidden layer still on the map; else `remove()`. |
| `clear()` | Empty stack + `remove()`. Called from `clearAllLayers`. |

`LayerManager.addLayerToMap` does `legend.push` then `legend.update` so the newly shown layer’s legend is visible even if it was already in the stack.

## Legend HTML by layer

Title: layer icon + name from `CITIES_CONFIG`.

| Layer | Content |
|-------|---------|
| **Calles** | Pavimentado / No pavimento swatches (`COLOR_PALETTES.calles`) |
| name includes **Población** | Más varones / Más mujeres / Equilibrado (±5%) / Sin datos + city footnote (Censo 2022) |
| **Barrios** | Up to 8 distinct `MapUtils.getNeighborhoodKey` labels (name + municipio); `...` if more |
| **Asentamientos** | Up to 6 unique `properties.Barrios` (GR field). VA uses `nombre_bar` for styling but this legend branch only reads `Barrios`, so VA may show an empty list beyond the title |
| name includes **Circuito** | Up to 8 of `CIRC_ELECT` \|\| `circuito` \|\| `CIRC` |
| **Escuelas** | If no feature has school level fields: single default swatch + note that points are mesas establishments, not a full catalog. If levels exist: jardín+primario / solo secundario / primario / jardín / sin niveles + special types (biblioteca, CEF, instituto, adultos). Footnote mentions Padrón Oficial 2025 when any feature has `fuente_padron` |
| other layers | Title only (no swatch list) |

Uses [`COLOR_PALETTES`](config.md) and [`MapUtils.getColorByHash` / `getNeighborhoodKey` / `hasSchoolLevelFields`](map.md). CSS: [`.legend*`](../css/styles.md).

## Related

- [`layers.md`](layers.md) — when push/drop/clear run
- [`map.md`](map.md) — styles that the legend describes
