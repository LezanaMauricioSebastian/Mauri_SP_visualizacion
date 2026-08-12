# datos/

GeoJSON FeatureCollections (CRS84 / WGS84) served as static files. Paths come from `CITIES_CONFIG[city].dataPath`.

| Folder | City key | `dataPath` |
|--------|----------|------------|
| [`SP/`](SP/README.md) | `sp` | `datos/SP/` |
| [`gran_Resis/`](gran_Resis/README.md) | `gr` | `datos/gran_Resis/` |
| [`villa_angela/`](villa_angela/README.md) | `va` | `datos/villa_angela/` |

## How the app loads them

[`LayerManager.fetchGeoJSON`](../js/layers.md) requests `dataPath + config.file`. Cache key is `city::filename`, so Mesas and Electores (same file, two layers) share one fetch. Heavy layers are not idle-prefetched.

[`scripts/enrich_escuelas.py`](../scripts/enrich_escuelas.md) writes GR/VA `escuelas_*_enriquecido.geojson` from mesas files + the national school padrón.

## Shared themes

| Theme | Typical geometry | Notes |
|-------|------------------|--------|
| Calles | MultiLineString | `name`, `superclas` (pavimentado / no pavimento) |
| Barrios | MultiPolygon | SP: `nombre`; GR: `Barrio` + `Municipio` |
| Asentamientos | MultiPolygon | GR + VA only |
| Lugares públicos | Polygon / MultiPolygon | OSM `leisure` + `name` |
| Escuelas | Point / MultiPoint | SP full catalog; GR/VA enriched mesas |
| Comisarias | Point | SP only |
| Manzanas | Polygon / MultiPolygon | census block polygons |
| Manzanas_Puntos | Point | SP only, hidden, for barrio block counts |
| Circuitos | MultiPolygon | field names differ per city |
| Mesas / Electores | Point / MultiPoint | one file, two clustered layers |
| Radios / Población | MultiPolygon | SP split files; GR one file; VA join on `LINK` |
| Edificaciones | MultiPolygon | building footprints (very large) |

## Related

- Layer ↔ file mapping: [`js/config.md`](../js/config.md)
- Fetch/join/cache: [`js/layers.md`](../js/layers.md)
