# scripts/enrich_escuelas.py

Python 3 script (~196 lines) that enriches Gran Resistencia and Villa Ángela **mesas-by-school** GeoJSON with the **Padrón Oficial de Establecimientos Educativos 2025** (DIE-ICSE), matched on CUE/anexo (`cueanexo`).

SP already ships a full catalog (`escuelas_sp_completo.geojson`); this script does not touch `datos/SP/`.

## Dependencies

- `openpyxl` (read-only workbook)
- Padrón XLSX: default `/tmp/padron-escuelas/padron2025.xlsx`, or pass as `argv[1]`

Headers are on row 13; data from row 14 (as documented in the script).

## Usage

```bash
python3 scripts/enrich_escuelas.py [path/to/padron2025.xlsx]
```

## Jobs

| Source | Destination |
|--------|-------------|
| `datos/gran_Resis/mesas_electores_x_escuelas_amgr.geojson` | `datos/gran_Resis/escuelas_amgr_enriquecido.geojson` |
| `datos/villa_angela/mesas_electores_x_escuela_va.geojson` | `datos/villa_angela/escuelas_va_enriquecido.geojson` |

Those destinations are what `CITIES_CONFIG` uses for the **Escuelas** layer in `gr` / `va`.

## What gets copied

- Normalize CUE to 9-digit string (`norm_cue`).
- On hit: sector/ámbito/domicilio/contacto, modality flags, all `nvc*` / `nve*` / `nva*` / `nvh*` level flags, `tallerartist`, `servcomplem`, `nveadultos`, `fuente_padron`.
- If padrón name differs, set `nombre_padron` (keep original `nombre`).
- On miss: zero-fill flag fields.

Stdout: hit/miss counts per file.

## How the app uses the result

- [`MapUtils.hasSchoolLevelFields`](../js/map.md) → colored school markers + detailed popup.
- [`LegendManager`](../js/legends.md) → full Escuelas legend + padrón footnote when `fuente_padron` is present.
- [`NeighborhoodCounts`](../js/spatial.md) (GR only, with Barrios) can count these points inside barrios.

## Related

- [`README.md`](README.md) · [`../js/config.md`](../js/config.md)
