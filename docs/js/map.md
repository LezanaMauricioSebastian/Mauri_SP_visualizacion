# js/map.js

Leaflet map instance plus styling/popup utilities. ~549 lines. Two globals: `MapManager`, `MapUtils`.

## `MapManager`

Holds `this.map` (Leaflet) and `this.currentCity` (default `'sp'`).

| Method | Behavior |
|--------|----------|
| `init()` | `L.map('map').setView(center, zoom)` from `CITIES_CONFIG[currentCity]`. Base layers: **OpenStreetMap**, **Satelital** (Esri), **Topográfico** (OpenTopoMap). OSM is default. `L.control.layers` for basemap switch. Zoom control moved to `topright`. Hides `#loading`. |
| `switchToCity(cityKey)` | Sets `currentCity` and `map.setView`. Does **not** clear overlay layers (that is `LayerManager.clearAllLayers`). |
| `getMap()` | Leaflet map instance. |
| `getCurrentCity()` | `'sp'` \| `'gr'` \| `'va'`. |

## `MapUtils`

Static helpers used by [`LayerManager`](layers.md), [`LegendManager`](legends.md), and [`NeighborhoodCounts`](spatial.md).

### `getColorByHash(value, palette)`

Deterministic color from string hash into a `COLOR_PALETTES` array. Empty value → `palette[0]`.

### `getNeighborhoodKey(properties)`

Stable barrio id for coloring, legend labels, and counts:

- name = `nombre` \|\| `Barrio` \|\| `'Sin nombre'`
- municipio = `Municipio` \|\| `municipio`
- id = `ID` \|\| `id`

Returns `name`, `name::municipio`, `name::id`, or `name::municipio::id`.

SP barrios use `nombre` + `id`. GR barrios use `Barrio` + `Municipio` + `ID`.

### `hasSchoolLevelFields(properties)`

True if any of `nvcjinfantes`, `nvcprimario`, `nvcsecundario`, `nvcjmaternal` exist (own property). Distinguishes SP/enriched school catalogs from GR/VA mesas-only points.

### `buildPopupContent(feature, properties, layerName, currentCity)`

HTML for the popup, **evaluated when the popup opens** (not at bind time) so Barrios counts stay current.

Title row: layer icon + `layerName`.

Special cases:

1. **Población** (name includes `'Población'`): total / mujeres / varones / viviendas + gender split %. SP fields `Datos x ra`, `Datos x _1`, `_2`, `_3`. GR/VA: `2022Total`, `2022Mujere`, `2022Varone`, `2022Total_`. Optional `AREA`.
2. **Escuelas** with level fields: name, domicilio, sector, institution type (biblioteca / centro de educacion fisica / instituto / e.p.a / escuela + jardín/primario/secundario), optional mesas/electores.
3. **Barrios**: if counts are still undefined, calls `window.layerManager.applyNeighborhoodCounts()`. Then, only if `hasCountingDataset(...)`:
   - Escuelas → `🏫 Escuelas en el barrio: ${schoolCount}`
   - Comisarias → `🚔 Comisarías en el barrio: ${policeCount}`
   - Manzanas_Puntos → `🏘️ Manzanas en el barrio: ${blockCount}`
4. Default: iterate `properties` from config, via `TRANSLATIONS[layerName]`. Tweaks: empty public-place `name` → `"Plaza"`; Calles `superclas === 'desconocido'` → `"No pavimento"`.

### `createCustomPopup(feature, layer, properties, layerName, currentCity)`

`layer.bindPopup(() => buildPopupContent(...), { className: 'custom-popup', maxWidth })`. Escuelas maxWidth 350, else 300.

### `getLayerStyle(feature, layerName)`

Returns Leaflet path options:

| Layer | Style |
|-------|--------|
| **Calles** | `superclas` / `surface` / `highway` → pavimentado (`#2196F3`) vs no pavimento (`#FF5722`), weight 3 |
| **Población por Radio** | gender palette: más varones / más mujeres / equilibrado (±5%) / sin datos |
| **Radios Censales** | hash of `RADIO` / `RADIO2020` / `LINK` on `COLOR_PALETTES.radios` |
| **Barrios** | hash of `getNeighborhoodKey`; triggers `applyNeighborhoodCounts()` once if counts unset |
| **Asentamientos** | hash of `Barrios` \|\| `nombre_bar` |
| **Circuito…** | hash of `CIRC_ELECT` \|\| `circuito` \|\| `CIRC` |
| **Escuelas** | no level fields → `COLOR_PALETTES.escuelas.default`; else type/level colors + `radius: 8` |
| fallback | `#667eea`, fillOpacity 0.3 |

## Connections

- Palettes / translations: [`config.js`](config.md)
- Counts API: `window.layerManager` ([`layers.md`](layers.md) → [`spatial.md`](spatial.md))
- Popup/legend CSS: [`styles.md`](../css/styles.md)

## Related

- [`layers.md`](layers.md) — who calls `getLayerStyle` / `createCustomPopup`
- [`legends.md`](legends.md) — same palettes for legend swatches
