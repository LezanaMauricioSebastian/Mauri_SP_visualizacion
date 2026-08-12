# tmp-prod-screenshots/

Local smoke-test artifacts against the deployed GitHub Pages app. **Not** loaded at runtime.

| File | Contents |
|------|----------|
| `report.json` | Automated findings (city buttons, layer counts, Barrios popup counts, console/network errors) |
| `report2.json` | Same kind of report from a later run |

Typical URL in reports: `https://lezanamauriciosebastian.github.io/Mauri_SP_visualizacion/`.

These files are useful historical QA notes (e.g. Barrios popup showing `Escuelas en el barrio: 0` when Escuelas is unchecked). That matches current code: [`loadCountingLayers`](../js/layers.md) prefetches Escuelas GeoJSON whenever Barrios is shown, and popups display a row whenever `hasCountingDataset('Escuelas')` is true.

## Related

- [Project overview](../README.md)
- Counting behavior: [`../js/spatial.md`](../js/spatial.md)
