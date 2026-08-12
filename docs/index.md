# index.html

Single-page shell for **Mapa Interactivo del Chaco**. Spanish UI (`lang="es"`). No framework, no bundler.

## Head

| Resource | Purpose |
|----------|---------|
| `favicon.ico` | Tab icon (referenced; file may be missing locally) |
| Leaflet 1.9.4 CSS | Map + controls |
| Leaflet.markercluster CSS | Cluster bubbles for Mesas/Electores |
| Font Awesome 6.4 | Icons in header, layer labels, popups, legend |
| Inter (Google Fonts) | Body / UI type |
| [`css/styles.css`](css/styles.md) | App layout |

`preconnect` hints: unpkg, cdnjs, fonts, OSM tiles.

## Body structure

```
header.header
  .header-content
    .logo          → icon + h1 “Mapa Interactivo del Chaco”
    .city-selector → three .city-option buttons
.map-container
  #loading         → “Cargando mapa...”
  #map             → Leaflet root
  #controls-panel  → “Capas del Mapa” + #layer-controls
```

City buttons (wired in [`UIManager.setupEventListeners`](js/ui.md)):

| `data-city` | Label |
|-------------|--------|
| `sp` | Presidencia Roque S. Peña (`.active` on first paint) |
| `gr` | Gran Resistencia |
| `va` | Villa Ángela |

`#layer-controls` starts empty; [`UIManager.createLayerControls`](js/ui.md) fills it from `CITIES_CONFIG`.

## Script load order

```html
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster/dist/leaflet.markercluster.js"></script>
<script src="js/config.js?v=9"></script>
<script src="js/map.js?v=7"></script>
<script src="js/spatial.js?v=1"></script>
<script src="js/legends.js?v=1"></script>
<script src="js/layers.js?v=6"></script>
<script src="js/ui.js?v=3"></script>
<script src="js/app.js?v=2"></script>
```

`spatial.js` and `legends.js` must load **before** `layers.js` (`LayerManager` constructs `NeighborhoodCounts` and `LegendManager`). `config.js` and `map.js` must load before `spatial.js` (`NeighborhoodCounts` / legends use `MapUtils` and `CITIES_CONFIG` / `COLOR_PALETTES`).

Cache-bust `?v=` values (as of this writing): config **9**, map **7**, spatial **1**, legends **1**, layers **6**, ui **3**, app **2**.

## Related

- [Project overview](README.md)
- [CSS](css/README.md) · [JS modules](js/README.md)
