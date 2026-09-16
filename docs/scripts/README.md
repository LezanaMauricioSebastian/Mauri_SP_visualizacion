# scripts/

Offline data utilities. Not loaded by the browser app.

| Script | Purpose |
|--------|---------|
| [`enrich_escuelas.py`](enrich_escuelas.md) | Join GR/VA mesas GeoJSON to the national school padrón (CUE) and write `escuelas_*_enriquecido.geojson` |
| [`fetch_negocios_osm.py`](fetch_negocios_osm.md) | Overpass download of OSM shops/amenities/offices → `negocios_osm_*.geojson` per city |

## Related

- Output files: [`../datos/gran_Resis/`](../datos/gran_Resis/README.md), [`../datos/villa_angela/`](../datos/villa_angela/README.md), [`../datos/SP/`](../datos/SP/README.md)
- How Escuelas are styled: [`../js/map.md`](../js/map.md), [`../js/legends.md`](../js/legends.md)
- Negocios layer + manzana counts: [`../js/spatial.md`](../js/spatial.md), [`../datos/README.md`](../datos/README.md)
