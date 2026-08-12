# datos/villa_angela/

Villa Ángela (`va`). `dataPath`: `datos/villa_angela/`.

## Files used by `CITIES_CONFIG.va`

| File | Layer(s) | Geometry | Notable properties |
|------|----------|----------|--------------------|
| `calles_2024_va.geojson` | Calles | MultiLineString | `name`, `superclas` (~3356, heavy) |
| `asentamientos_va.geojson` | Asentamientos | MultiPolygon | RENABAP: `nombre_bar`, `municipio`, services, `superficie`, … |
| `lugares_publicos_va.geojson` | Lugares públicos | Polygon | `leisure`, `name` |
| `escuelas_va_enriquecido.geojson` | Escuelas | MultiPoint | mesas + padrón (~16) |
| `mzas_poligonos_22_va.geojson` | Manzanas | Polygon | `DFRM`, `AREA` (~1054, heavy) |
| `circuitos_electoral_va.geojson` | Circuito electoral | MultiPolygon | `CIRC`, `CIRCUITO`, `MUNICIPIO` |
| `mesas_electores_x_escuela_va.geojson` | Mesas + Electores | MultiPoint | `nombre`, `CuentaDeNU`, `SumaDeCuen`, `circuito` |
| `radios_censo_va.geojson` | Radios Censales; also base of Población | MultiPolygon | `LINK`, `AREA`, `2022Total`, `2022Mujere`, `2022Varone` |
| `cant_viv_radio_va.geojson` | join file for Población por Radio | MultiPolygon | `LINK`, `2022Total_` (viviendas), dwelling types |
| `Edificaciones_2024_Siluetas_va.geojson` | Edificaciones | MultiPolygon | `area_in_me`, `full_plus_` (~33854, heavy) |

**Población por Radio** uses `file: radios_censo_va.geojson` + `joinFile: cant_viv_radio_va.geojson` on `joinProperty: 'LINK'` ([`LayerManager.joinGeoJSONByProperty`](../../js/layers.md)).

## Escuelas source

`escuelas_va_enriquecido.geojson` is produced from `mesas_electores_x_escuela_va.geojson` by [`scripts/enrich_escuelas.py`](../../scripts/enrich_escuelas.md).

## No Barrios layer

VA has no `Barrios` entry in config. Neighborhood counting (`schoolCount` / etc.) never runs. Escuelas still style/popup using padrón level fields.

## Files on disk but not referenced in config

| File | Note |
|------|------|
| `mzas_poly_22_va.geojson` | Alternate manzanas; app uses `mzas_poligonos_22_va.geojson` |

## Related

- [`../README.md`](../README.md) · [`../../js/config.md`](../../js/config.md)
- [`../SP/`](../SP/README.md) · [`../gran_Resis/`](../gran_Resis/README.md)
