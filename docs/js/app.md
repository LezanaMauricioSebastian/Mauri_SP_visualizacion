# js/app.js

Tiny bootstrap (~32 lines). Instantiated on `DOMContentLoaded`.

## `MapApp`

| Member | Role |
|--------|------|
| `this.mapManager` | [`MapManager`](map.md) |
| `this.layerManager` | [`LayerManager`](layers.md) |
| `this.uiManager` | [`UIManager`](ui.md) |
| `init()` | Construct the three managers, then `mapManager.init()` and `uiManager.init()` |

Construction order: map → layers (needs map) → UI (needs both).

## Global `window.layerManager`

After `init()`, the app assigns `window.layerManager = app.layerManager` so [`MapUtils`](map.md) style/popup code can call:

- `applyNeighborhoodCounts()`
- `hasCountingDataset('Escuelas' | 'Comisarias' | 'Manzanas_Puntos')`

Those methods are the stable `LayerManager` façade; internally they delegate to [`NeighborhoodCounts`](spatial.md).

## Related

- [`ui.md`](ui.md) · [`layers.md`](layers.md) · [`map.md`](map.md)
