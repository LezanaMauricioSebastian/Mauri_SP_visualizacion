# datos/gran_Resis/

Gran Resistencia / Área Metropolitana (`gr`). `dataPath`: `datos/gran_Resis/`.

## Files used by `CITIES_CONFIG.gr`

| File | Layer(s) | Geometry | Notable properties |
|------|----------|----------|--------------------|
| `calles_2024_amgr.geojson` | Calles | MultiLineString | `name`, `superclas` (~13526, heavy) |
| `barrios_amgr.geojson` | Barrios | MultiPolygon | `Barrio`, `Municipio`, `ID` |
| `asentamientos_amgr.geojson` | Asentamientos | MultiPolygon | `Barrios`, `Municipio` |
| `lugares_publicos_amgr.geojson` | Lugares públicos | MultiPolygon / Polygon | OSM `leisure`, `name` |
| `escuelas_amgr_enriquecido.geojson` | Escuelas | MultiPoint | mesas fields + padrón levels / `fuente_padron` (~142) |
| `manzanero_amgr.geojson` | Manzanas | MultiPolygon | `PDLFRM`, `AREA` (~6824, heavy) |
| `circuitos_elect_amgr.geojson` | Circuito electoral | MultiPolygon | `circuito`, `cabecera`, `departamen` |
| `mesas_electores_x_escuelas_amgr.geojson` | Mesas + Electores | MultiPoint | `nombre`, `cn_mesas`, `electores`, `circuito` |
| `poblac_viv_radio_22_amgr.geojson` | Radios Censales **and** Población por Radio | MultiPolygon | `LINK`, `AREA`, `2022Total`, `2022Mujere`, `2022Varone`, `2022Total_` |

## Escuelas source

`escuelas_amgr_enriquecido.geojson` is generated from `mesas_electores_x_escuelas_amgr.geojson` by [`scripts/enrich_escuelas.py`](../../scripts/enrich_escuelas.md) (join on `cueanexo` to Padrón Oficial 2025). Legend treats it as a level-classified catalog when `nvc*` fields are present, with a padrón footnote if `fuente_padron` is set.

## Counting

Barrios exist, so school counts can run once Escuelas GeoJSON is cached. No **Comisarias** or **Manzanas_Puntos** layers → police/block rows never appear (`hasCountingDataset` is false).

## Related

- [`../README.md`](../README.md) · [`../../js/config.md`](../../js/config.md)
- [`../SP/`](../SP/README.md) · [`../villa_angela/`](../villa_angela/README.md)
