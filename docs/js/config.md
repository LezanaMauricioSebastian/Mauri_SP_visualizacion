# js/config.js

Static catalogs: cities, layer files, color palettes, popup label translations. ~460 lines. No classes.

## `CITIES_CONFIG`

Keys: `'sp'`, `'gr'`, `'va'`.

Each city:

| Field | Meaning |
|-------|---------|
| `name` | Full name (header after switch) |
| `center` | `[lat, lng]` for `setView` |
| `zoom` | Initial zoom (`sp`/`va` 13, `gr` 12) |
| `dataPath` | GeoJSON prefix: `datos/SP/`, `datos/gran_Resis/`, `datos/villa_angela/` |
| `layers` | Map of **UI layer name** → layer config |

### Layer config fields

| Field | Used for |
|-------|----------|
| `file` | GeoJSON filename under `dataPath` |
| `properties` | Popup field list (and translations lookup) |
| `icon` | Font Awesome class on checkbox, popup title, legend |
| `group` | Panel section: Infraestructura, Divisiones, Servicios, Electoral, Censo |
| `heavy` | Skip idle prefetch; use canvas renderer; usually paired with `featureCount` |
| `featureCount` | Badge without fetching (Calles, Manzanas, Edificaciones, some Escuelas) |
| `hidden` | Omit from UI; still used for counting (`Manzanas_Puntos` in `sp`) |
| `type: 'clustered'` | MarkerCluster layer |
| `valueProperty` | Property summed in cluster icons (`CUENTADENU`, `cn_mesas`, …) |
| `joinFile` + `joinProperty` | Merge extra GeoJSON (VA **Población por Radio**: `radios_censo_va.geojson` + `cant_viv_radio_va.geojson` on `LINK`) |

Same GeoJSON can back two layers (e.g. Mesas + Electores; GR Radios + Población). Cache key is `city::file`, so the file is fetched once.

### Layer inventory by city

**`sp` — Presidencia Roque Sáenz Peña**

| Layer | File | Notes |
|-------|------|--------|
| Calles | `calles_2024_sp_corregido.geojson` | heavy, 5822 |
| Barrios | `barrios_sp.geojson` | counting target |
| Lugares públicos | `lugares_publicos_sp.geojson` | |
| Escuelas | `escuelas_sp_completo.geojson` | full catalog + levels |
| Comisarias | `policia_comisarias_sp.geojson` | SP only |
| Manzanas | `mzas_poly_22_sp.geojson` | heavy, 1963 |
| Manzanas_Puntos | `mzas_point_22_sp.geojson` | **hidden**, block counts |
| Circuito electoral | `circuilto_elect_sp.geojson` | filename typo kept |
| Mesas por Escuela | `mesas_electores_x_escuela_sp.geojson` | clustered, `CUENTADENU` |
| Electores por Escuela | same file | clustered, `SUMADECUEN` |
| Radios Censales | `radios_censo_sp.geojson` | |
| Población por Radio | `cant_viv_radio_sp.geojson` | `Datos x *` fields |
| Edificaciones | `Edificaciones_2024_Siluetas.geojson` | heavy, 91799 |

**`gr` — Gran Resistencia**

| Layer | File | Notes |
|-------|------|--------|
| Calles | `calles_2024_amgr.geojson` | heavy, 13526 |
| Barrios | `barrios_amgr.geojson` | `Barrio` + `Municipio` |
| Asentamientos | `asentamientos_amgr.geojson` | |
| Lugares públicos | `lugares_publicos_amgr.geojson` | |
| Escuelas | `escuelas_amgr_enriquecido.geojson` | mesas + padrón levels, 142 |
| Manzanas | `manzanero_amgr.geojson` | heavy, 6824 |
| Circuito electoral | `circuitos_elect_amgr.geojson` | |
| Mesas / Electores | `mesas_electores_x_escuelas_amgr.geojson` | `cn_mesas` / `electores` |
| Radios + Población | `poblac_viv_radio_22_amgr.geojson` | same file, `2022*` fields |

No Comisarias, no Manzanas_Puntos, no Edificaciones.

**`va` — Villa Ángela**

| Layer | File | Notes |
|-------|------|--------|
| Calles | `calles_2024_va.geojson` | heavy, 3356 |
| Asentamientos | `asentamientos_va.geojson` | RENABAP-style fields |
| Lugares públicos | `lugares_publicos_va.geojson` | |
| Escuelas | `escuelas_va_enriquecido.geojson` | mesas + padrón, 16 |
| Manzanas | `mzas_poligonos_22_va.geojson` | heavy, 1054 |
| Circuito electoral | `circuitos_electoral_va.geojson` | |
| Mesas / Electores | `mesas_electores_x_escuela_va.geojson` | `CuentaDeNU` / `SumaDeCuen` |
| Radios Censales | `radios_censo_va.geojson` | also has `2022Total` / gender |
| Población por Radio | `radios_censo_va.geojson` + join `cant_viv_radio_va.geojson` on `LINK` | |
| Edificaciones | `Edificaciones_2024_Siluetas_va.geojson` | heavy, 33854 |

**No Barrios layer** in VA → neighborhood counting UI does not run there.

Unused files on disk (not referenced in config): see [`datos/`](../datos/README.md).

## `COLOR_PALETTES`

| Key | Kind |
|-----|------|
| `radios`, `barrios`, `circuitos`, `asentamientos` | hash arrays |
| `calles` | `pavimentado` / `no pavimento` / OSM highway aliases |
| `genero` | `mas_hombres`, `mas_mujeres`, `equilibrado`, `sin_datos` |
| `escuelas` | `solo_infantes`, `solo_primario`, `solo_secundario`, `infantes_primario`, `biblioteca`, `centro_educacion_fisica`, `instituto_especializado`, `educacion_adultos`, `sin_niveles`, `default` |

Used by [`MapUtils.getLayerStyle`](map.md) and [`LegendManager.update`](legends.md).

## `TRANSLATIONS`

`layerName → { geojsonProperty → Spanish label }`. Covers Calles, Lugares públicos, Escuelas, Barrios, Asentamientos, Manzanas, Población por Radio, Radios Censales, Mesas/Electores (SP + GR + VA field names), Circuito electoral.

Unknown properties fall back to the raw GeoJSON key.

## Related

- [`datos/README.md`](../datos/README.md) — files on disk
- [`layers.md`](layers.md) — who reads this config
