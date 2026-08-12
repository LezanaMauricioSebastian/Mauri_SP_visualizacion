# js/ui.js

DOM for **Capas del Mapa** and the **city switcher**. No Leaflet drawing except through `LayerManager` / `MapManager`.

See also: [`layers.js`](layers.md) · [`map.js`](map.md) · [`index.html`](../index.md) · [`css/styles.md`](../css/styles.md)

## `UIManager`

```js
new UIManager(mapManager, layerManager)
```

| Method | Role |
|--------|------|
| `init()` | `createLayerControls()` + `setupEventListeners()` |
| `createLayerControls()` | Rebuild `#layer-controls` from `CITIES_CONFIG[currentCity].layers` |
| `createLayerControlItem(name, config)` | Checkbox + icon label + `.layer-count` |
| `handleLayerToggle(checkbox, name, config, countSpan)` | Load/add or remove |
| `switchCity(cityKey)` | Clear layers, fly map, restyle buttons, rebuild panel, update `<h1>` |
| `setupEventListeners()` | Click on `.city-option` → `switchCity(btn.dataset.city)` |

## Capas del Mapa

Layers with `config.hidden` (SP **Manzanas_Puntos**) are **not** listed.

Visible layers are grouped by `config.group` (order = first appearance in `CITIES_CONFIG`):

- Infraestructura
- Divisiones
- Servicios
- Electoral
- Censo

Each row:

- `#layer-${name}` checkbox
- Label: `<i class="${config.icon}"></i> ${name}` (Escuelas, Barrios, Calles, …)
- Count badge: starts as `...`, then `getFeatureCount` → locale string, or `—` on failure

After building the panel, calls `layerManager.prefetchIdleLayerData()` so light GeoJSON warms the cache.

## Toggle flow

**Check on:**

1. Remember `cityWhenStarted`.
2. If layer not in `getLoadedLayers()`, show `Cargando...` and `await loadLayer`. If city changed or load cancelled, stop. On other errors: uncheck + `Error`.
3. If still current city and still checked → `addLayerToMap(name)`.

**Check off:** `removeLayerFromMap(name)`.

`stillCurrent()` = checkbox still checked **and** `getCurrentCity() === cityWhenStarted`. This pairs with `layerGeneration` so a slow SP Edificaciones load cannot land after the user switched to VA.

## City switcher (`sp` / `gr` / `va`)

`switchCity`:

1. No-op if already that city.
2. `layerManager.clearAllLayers()` — bumps generation, drops legend, wipes GeoJSON cache.
3. `mapManager.switchToCity(cityKey)` — pan/zoom.
4. Toggle `.active` on buttons via `data-city`.
5. `createLayerControls()` for the new city’s layer set.
6. Set `.logo h1` to `Mapa Interactivo - ${CITIES_CONFIG[cityKey].name}`.

Initial HTML title is `Mapa Interactivo del Chaco`; after the first switch it becomes the city-specific string. Default city remains `sp` until the user clicks.
