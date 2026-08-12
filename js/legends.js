// Leyendas de capas (HTML + stack de la última capa visible)
class LegendManager {
  constructor(mapManager, getLoadedLayers) {
    this.mapManager = mapManager;
    this.getLoadedLayers = getLoadedLayers;
    this.currentLegend = null;
    this.legendStack = [];
    this.analysisMode = false;
    this.collapsed = this.readCollapsedPref();
  }

  readCollapsedPref() {
    try {
      return localStorage.getItem('mauri_sp_legend_collapsed') === '1';
    } catch (e) {
      return false;
    }
  }

  persistCollapsed() {
    try {
      localStorage.setItem('mauri_sp_legend_collapsed', this.collapsed ? '1' : '0');
    } catch (e) { /* ignore */ }
  }

  applyCollapsedState(div) {
    if (!div) return;
    const toggleBtn = div.querySelector('.legend-title');
    div.classList.toggle('collapsed', this.collapsed);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-expanded', String(!this.collapsed));
      toggleBtn.setAttribute('title', this.collapsed ? 'Expandir' : 'Contraer');
    }
  }

  updateAnalysis(title, items, footnote) {
    this.analysisMode = true;
    this.remove();

    this.currentLegend = L.control({ position: 'bottomright' });
    this.currentLegend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      let content = `<button type="button" class="legend-title" aria-expanded="true" aria-controls="legend-body" title="Contraer">
        <span class="legend-title-text"><i class="fas fa-chart-area"></i> ${title}</span>
        <i class="fas fa-chevron-up legend-chevron" aria-hidden="true"></i>
      </button>`;
      let body = '';
      (items || []).forEach((item) => {
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${item.color}"></div>
          ${item.label}
        </div>`;
      });
      if (footnote) {
        body += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
          ${footnote}
        </div>`;
      }
      content += `<div class="legend-body" id="legend-body">${body}</div>`;
      div.innerHTML = content;

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      this.applyCollapsedState(div);

      const toggleBtn = div.querySelector('.legend-title');
      if (toggleBtn) {
        L.DomEvent.on(toggleBtn, 'click', (e) => {
          L.DomEvent.stop(e);
          this.collapsed = !this.collapsed;
          this.persistCollapsed();
          this.applyCollapsedState(div);
        });
      }
      return div;
    };
    this.currentLegend.addTo(this.mapManager.getMap());
  }

  clearAnalysis() {
    if (!this.analysisMode) {
      this.remove();
      return;
    }
    this.analysisMode = false;
    this.restoreTop();
  }

  update(layerName) {
    this.analysisMode = false;
    this.remove();

    const loadedLayers = this.getLoadedLayers();
    if (!loadedLayers[layerName]) return;

    this.currentLegend = L.control({ position: 'bottomright' });
    this.currentLegend.onAdd = () => {
      const div = L.DomUtil.create('div', 'legend');
      const currentCity = this.mapManager.getCurrentCity();
      const layers = this.getLoadedLayers();
      const layerIcon = CITIES_CONFIG[currentCity].layers[layerName].icon;
      let content = `<button type="button" class="legend-title" aria-expanded="true" aria-controls="legend-body" title="Contraer">
        <span class="legend-title-text"><i class="${layerIcon}"></i> ${layerName}</span>
        <i class="fas fa-chevron-up legend-chevron" aria-hidden="true"></i>
      </button>`;
      let body = '';

      if (layerName === 'Calles') {
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.calles['pavimentado']}"></div>
          Pavimentado
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.calles['no pavimento']}"></div>
          No pavimento
        </div>`;
      } else if (layerName.includes('Población')) {
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.mas_hombres}"></div>
          Más varones
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.mas_mujeres}"></div>
          Más mujeres
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.equilibrado}"></div>
          Equilibrado (±5%)
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.sin_datos}"></div>
          Sin datos
        </div>`;

        if (currentCity === 'va') {
          body += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Villa Ángela:</strong> Datos del Censo 2022 por radio censal
          </div>`;
        } else if (currentCity === 'sp') {
          body += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Saenz Peña:</strong> Datos del Censo 2022 por radio censal
          </div>`;
        } else if (currentCity === 'gr') {
          body += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Gran Resistencia:</strong> Datos del Censo 2022 por radio censal
          </div>`;
        }
      } else if (layerName === 'Barrios') {
        const labels = new Map();
        layers[layerName].geojson.features.forEach(f => {
          const key = MapUtils.getNeighborhoodKey(f.properties);
          if (labels.has(key)) return;
          const nombre = (f.properties && (f.properties.nombre || f.properties.Barrio)) || 'Sin nombre';
          const muni = f.properties && (f.properties.Municipio || f.properties.municipio);
          labels.set(key, muni ? `${nombre} (${muni})` : nombre);
        });
        Array.from(labels.entries()).slice(0, 8).forEach(([key, label]) => {
          body += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(key, COLOR_PALETTES.barrios)}"></div>
            ${label}
          </div>`;
        });
        if (labels.size > 8) body += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
      } else if (layerName === 'Asentamientos') {
        const nombres = new Set();
        layers[layerName].geojson.features.forEach(f => {
          if (f.properties && f.properties.Barrios) nombres.add(f.properties.Barrios);
        });
        Array.from(nombres).slice(0, 6).forEach(nombre => {
          body += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(nombre, COLOR_PALETTES.asentamientos)}"></div>
            ${nombre}
          </div>`;
        });
        if (nombres.size > 6) body += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
      } else if (layerName.includes('Circuito')) {
        const circuitos = new Set();
        layers[layerName].geojson.features.forEach(f => {
          const circuito = f.properties && (f.properties.CIRC_ELECT || f.properties.circuito || f.properties.CIRC);
          if (circuito) circuitos.add(circuito);
        });
        Array.from(circuitos).slice(0, 8).forEach(circuito => {
          body += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(circuito, COLOR_PALETTES.circuitos)}"></div>
            Circuito ${circuito}
          </div>`;
        });
        if (circuitos.size > 8) body += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
      } else if (layerName === 'Escuelas') {
        const escuelasGeo = layers[layerName].geojson;
        const hasLevels = !!(escuelasGeo && escuelasGeo.features &&
          escuelasGeo.features.some((f) => MapUtils.hasSchoolLevelFields(f.properties)));

        if (!hasLevels) {
          body += `<div class="legend-item">
            <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.default};border-radius:50%;width:12px;height:12px;"></div>
            Escuelas (mesas electorales)
          </div>`;
          body += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Establecimientos con mesas:</strong> mismos datos que Mesas/Electores por Escuela<br>
            <small>No es un catálogo completo de instituciones educativas</small>
          </div>`;
        } else {
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.infantes_primario};border-radius:50%;width:12px;height:12px;"></div>
          Jardín + Primario
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.solo_secundario};border-radius:50%;width:12px;height:12px;"></div>
          Solo Secundario
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.solo_primario};border-radius:50%;width:12px;height:12px;"></div>
          Solo Primario
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.solo_infantes};border-radius:50%;width:12px;height:12px;"></div>
          Solo Jardín
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.sin_niveles};border-radius:50%;width:12px;height:12px;"></div>
          Sin niveles definidos
        </div>`;

        body += `<div style="margin-top:15px;font-weight:bold;color:#333;">Instituciones especiales:</div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.biblioteca};border-radius:50%;width:12px;height:12px;"></div>
          📚 Bibliotecas
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.centro_educacion_fisica};border-radius:50%;width:12px;height:12px;"></div>
          ⚽ Centros de Educación Física
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.instituto_especializado};border-radius:50%;width:12px;height:12px;"></div>
          🎨 Institutos Especializados
        </div>`;
        body += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.educacion_adultos};border-radius:50%;width:12px;height:12px;"></div>
          👨‍🎓 Educación para Adultos
        </div>`;

        const fromPadron = !!(escuelasGeo && escuelasGeo.features &&
          escuelasGeo.features.some((f) => f.properties && f.properties.fuente_padron));
        body += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
          <strong>Instituciones Educativas:</strong> Clasificación por tipo y niveles<br>
          <small>${fromPadron
            ? 'Niveles y contacto: Padrón Oficial 2025 (DIE). Puntos: establecimientos con mesas electorales.'
            : 'Incluye escuelas tradicionales e instituciones especiales'}</small>
        </div>`;
        }
      }

      content += `<div class="legend-body" id="legend-body">${body}</div>`;
      div.innerHTML = content;

      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      this.applyCollapsedState(div);

      const toggleBtn = div.querySelector('.legend-title');
      if (toggleBtn) {
        L.DomEvent.on(toggleBtn, 'click', (e) => {
          L.DomEvent.stop(e);
          this.collapsed = !this.collapsed;
          this.persistCollapsed();
          this.applyCollapsedState(div);
        });
      }

      return div;
    };
    this.currentLegend.addTo(this.mapManager.getMap());
  }

  remove() {
    if (this.currentLegend) {
      this.mapManager.getMap().removeControl(this.currentLegend);
      this.currentLegend = null;
    }
  }

  push(layerName) {
    this.legendStack = this.legendStack.filter((name) => name !== layerName);
    this.legendStack.push(layerName);
  }

  drop(layerName) {
    this.legendStack = this.legendStack.filter((name) => name !== layerName);
    this.restoreTop();
  }

  restoreTop() {
    const map = this.mapManager.getMap();
    const loadedLayers = this.getLoadedLayers();
    while (this.legendStack.length) {
      const name = this.legendStack[this.legendStack.length - 1];
      const data = loadedLayers[name];
      if (data && data.layer && !data.config.hidden && map.hasLayer(data.layer)) {
        this.update(name);
        return;
      }
      this.legendStack.pop();
    }
    this.remove();
  }

  clear() {
    this.legendStack = [];
    this.analysisMode = false;
    this.remove();
  }
}
