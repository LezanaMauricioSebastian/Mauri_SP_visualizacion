# datos/SP/

Presidencia Roque Sáenz Peña (`sp`). `dataPath`: `datos/SP/`.

## Files used by `CITIES_CONFIG.sp`

| File | Layer(s) | Geometry | Notable properties |
|------|----------|----------|--------------------|
| `calles_2024_sp_corregido.geojson` | Calles | MultiLineString | `name`, `superclas`, `highway`, `surface` (~5822) |
| `barrios_sp.geojson` | Barrios | MultiPolygon | `id`, `nombre` |
| `lugares_publicos_sp.geojson` | Lugares públicos | Polygon | OSM `leisure`, `name` |
| `escuelas_sp_completo.geojson` | Escuelas | MultiPoint | `nombre`, `domicilio`, `sector`, CUE, level flags (`nvcjinfantes`, …) |
| `policia_comisarias_sp.geojson` | Comisarias | Point | `Unidad`, `Direccion`, `correo ele`, `telefono` |
| `mzas_poly_22_sp.geojson` | Manzanas | MultiPolygon | `DFRM`, `AREA` (~1963) |
| `mzas_point_22_sp.geojson` | Manzanas_Puntos (**hidden**) | Point | centroids for block counts |
| `circuilto_elect_sp.geojson` | Circuito electoral | MultiPolygon | `CIRC_ELECT` (filename typo is intentional in config) |
| `mesas_electores_x_escuela_sp.geojson` | Mesas + Electores | Point | `NOMBRE_ESC`, `CUENTADENU`, `SUMADECUEN`, `CIRCUITO` |
| `radios_censo_sp.geojson` | Radios Censales | MultiPolygon | `LINK`, `RADIO`, `AREA` |
| `cant_viv_radio_sp.geojson` | Población por Radio | MultiPolygon | `Datos x ra` (total), `_1` mujeres, `_2` varones, `_3` viviendas, `RADIO2020` |
| `Edificaciones_2024_Siluetas.geojson` | Edificaciones | MultiPolygon | `area`, `full_plus_code` (~91799, heavy) |

## Neighborhood counting (SP only has the full set)

Enabling **Barrios** prefetches Escuelas + Comisarias + Manzanas_Puntos GeoJSON. Popups can show escuelas, comisarías, and manzanas per barrio.

## Files on disk but not referenced in config

| File | Note |
|------|------|
| `calles_2024_sp.geojson` | Older streets; app uses `*_corregido` |
| `edificaciones_sp.geojson` | Alternate buildings; app uses `Edificaciones_2024_Siluetas.geojson` |

## Related

- [`../README.md`](../README.md) · [`../../js/config.md`](../../js/config.md)
- Sibling cities: [`../gran_Resis/`](../gran_Resis/README.md) · [`../villa_angela/`](../villa_angela/README.md)
