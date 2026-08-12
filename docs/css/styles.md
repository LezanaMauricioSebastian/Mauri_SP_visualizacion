# css/styles.css

Layout and theming for the header, Capas del Mapa panel, Leaflet popups, and legend. ~332 lines.

## Reset and page chrome

- Universal box-sizing reset.
- `body` — Inter, full-viewport purple gradient (`#667eea` → `#764ba2`).
- `.header` / `.header-content` / `.logo` — frosted bar; title updated by [`UIManager.switchCity`](../js/ui.md) to `Mapa Interactivo - ${cityConfig.name}`.

## City selector

- `.city-selector` — pill group.
- `.city-option` / `.city-option.active` — inactive slate vs purple fill. Active class is toggled from `data-city`, not from CSS alone.

## Map and layer panel

- `.map-container` — rounded card, `calc(100vh - 120px)`.
- `#map` — fills the card.
- `.controls-panel` — absolute top-left overlay (`z-index: 1000`), max-height `70vh`, custom purple scrollbar.
- `.controls-header` — “Capas del Mapa”.
- `.layer-group` / `.layer-group-title` — group names from config (`Infraestructura`, `Divisiones`, …), uppercase.
- `.layer-item` / `.layer-checkbox` / `.layer-label` / `.layer-count` — checkbox row + feature-count badge (`...` → number / `Cargando...` / `Error` / `—`).

Leaflet zoom is moved to **top-right** in [`MapManager.init`](../js/map.md) so it does not cover this panel.

## Popups

`MapUtils.createCustomPopup` uses `className: 'custom-popup'`. Styles target `.leaflet-popup.custom-popup`:

- Dark translucent wrapper (`rgba(45, 55, 72, 0.95)`).
- `.popup-title` — layer name + icon (accent).
- `.popup-item` / `.popup-label` / `.popup-value` — label/value rows.

Escuelas popups use `maxWidth: 350`; others `300`.

## Legend

[`LegendManager`](../js/legends.md) creates a Leaflet control with class `legend`:

- `.legend-title` — layer name.
- `.legend-item` + `.legend-color` — swatch + label. Escuelas swatches are forced round (`border-radius: 50%`) inline in JS.

## Loading and responsive

- `.loading` / `.spinner` / `@keyframes spin` — centered overlay; hidden after map init.
- `@media (max-width: 768px)` — stacked header; panel becomes a bottom sheet (`max-height: 40vh`).
