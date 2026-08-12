// Módulo de manejo de capas
const COUNTING_LAYER_NAMES = ['Escuelas', 'Comisarias', 'Manzanas_Puntos'];

class LayerManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.loadedLayers = {};
    this.geojsonCache = {};
    this.inflightFetches = {};
    this.inflightLayers = {};
    this.currentLegend = null;
    this.legendStack = [];
    this.layerGeneration = 0;
    this.countingCalculated = false;
    this.countingCache = {
      schools: null,
      police: null,
      blocks: null
    };
    this._neighborhoodIndex = null;
  }

  isCountingLayer(layerName) {
    return COUNTING_LAYER_NAMES.includes(layerName);
  }

  hasCountingDataset(layerName) {
    const city = this.mapManager.getCurrentCity();
    const config = CITIES_CONFIG[city] && CITIES_CONFIG[city].layers[layerName];
    if (!config) return false;
    return !!this.getLayerGeoJSON(layerName);
  }

  getCacheKey(file, city = this.mapManager.getCurrentCity()) {
    return `${city}::${file}`;
  }

  // GeoJSON compartido por ciudad+archivo (Mesas/Electores, Radios/Población, etc.)
  async fetchGeoJSON(file) {
    const key = this.getCacheKey(file);
    if (this.geojsonCache[key]) {
      return this.geojsonCache[key];
    }
    if (this.inflightFetches[key]) {
      return this.inflightFetches[key];
    }

    const city = this.mapManager.getCurrentCity();
    const generation = this.layerGeneration;
    const url = CITIES_CONFIG[city].dataPath + file;
    const request = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Error loading ${file}`);
        return response.json();
      })
      .then((geojson) => {
        if (generation === this.layerGeneration) {
          this.geojsonCache[key] = geojson;
        }
        return geojson;
      })
      .finally(() => {
        if (this.inflightFetches[key] === request) {
          delete this.inflightFetches[key];
        }
      });

    this.inflightFetches[key] = request;
    return request;
  }

  getLayerGeoJSON(layerName) {
    if (this.loadedLayers[layerName] && this.loadedLayers[layerName].geojson) {
      return this.loadedLayers[layerName].geojson;
    }
    const city = this.mapManager.getCurrentCity();
    const config = CITIES_CONFIG[city] && CITIES_CONFIG[city].layers[layerName];
    if (!config) return null;
    return this.geojsonCache[this.getCacheKey(config.file, city)] || null;
  }

  async getFeatureCount(layerName, layerConfig) {
    if (typeof layerConfig.featureCount === 'number') {
      return layerConfig.featureCount;
    }
    const geojson = await this.fetchGeoJSON(layerConfig.file);
    return geojson && geojson.features ? geojson.features.length : 0;
  }

  prefetchIdleLayerData() {
    const city = this.mapManager.getCurrentCity();
    const cityConfig = CITIES_CONFIG[city];
    if (!cityConfig) return;

    const files = new Set();
    Object.values(cityConfig.layers).forEach((config) => {
      if (!config.heavy) {
        files.add(config.file);
        if (config.joinFile) files.add(config.joinFile);
      }
    });

    const prefetch = () => {
      if (this.mapManager.getCurrentCity() !== city) return;
      files.forEach((file) => {
        this.fetchGeoJSON(file).catch(() => {});
      });
    };

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(prefetch, { timeout: 2500 });
    } else {
      setTimeout(prefetch, 1);
    }
  }

  resetCountingState() {
    this.countingCalculated = false;
    this.countingCache = {
      schools: null,
      police: null,
      blocks: null
    };
    this._neighborhoodIndex = null;
  }

  // Crear marcador clusterizado
  createClusteredLayer(geojson, layerConfig, layerName) {
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: function (cluster) {
        let total = 0;
        let count = 0;

        try {
          const markers = cluster.getAllChildMarkers();
          for (let i = 0; i < markers.length; i++) {
            const marker = markers[i];
            const cached = marker && marker._clusterValue;
            if (cached && !isNaN(cached)) {
              total += cached;
              count++;
              continue;
            }
            if (marker && marker.feature && marker.feature.properties) {
              const value = parseInt(marker.feature.properties[layerConfig.valueProperty], 10);
              if (value && !isNaN(value)) {
                total += value;
                count++;
              }
            }
          }

          const avg = count > 0 ? total / count : 0;
          const color = total > avg ? '#d32f2f' : '#1976d2';

          return L.divIcon({
            html: `<div style="background:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${total || count}</div>`,
            className: '',
            iconSize: [40, 40]
          });
        } catch (error) {
          console.warn('Error en iconCreateFunction:', error);
          return L.divIcon({
            html: `<div style="background:#999;color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:3px solid white;">?</div>`,
            className: '',
            iconSize: [40, 40]
          });
        }
      },
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });

    const currentCity = this.mapManager.getCurrentCity();
    geojson.features.forEach((feature) => {
      try {
        const latlng = this.extractLatLng(feature.geometry);
        if (!latlng) return;
        if (Math.abs(latlng[0]) > 90 || Math.abs(latlng[1]) > 180) return;

        const value = parseInt(feature.properties[layerConfig.valueProperty], 10) || 0;
        const marker = L.marker(latlng, {
          icon: L.divIcon({
            html: `<div style="background:#667eea;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${value}</div>`,
            className: '',
            iconSize: [32, 32]
          })
        });

        marker.feature = feature;
        marker._clusterValue = value;
        MapUtils.createCustomPopup(feature, marker, layerConfig.properties, layerName, currentCity);
        clusterGroup.addLayer(marker);
      } catch (error) {
        console.warn('Error procesando feature de mesas electorales:', error);
      }
    });

    return clusterGroup;
  }

  // Crear capa de escuelas con círculos coloreados (Point y MultiPoint)
  createSchoolLayer(geojson, layerConfig, layerName) {
    const schoolLayer = L.layerGroup();
    const currentCity = this.mapManager.getCurrentCity();

    geojson.features.forEach((feature) => {
      try {
        const points = this.extractAllLatLngs(feature.geometry);
        if (!points.length) return;

        const style = MapUtils.getLayerStyle(feature, layerName);
        points.forEach((latlng) => {
          if (Math.abs(latlng[0]) > 90 || Math.abs(latlng[1]) > 180) return;
          const circle = L.circleMarker(latlng, {
            radius: style.radius || 8,
            fillColor: style.fillColor,
            color: style.color,
            weight: style.weight || 2,
            opacity: style.opacity || 0.9,
            fillOpacity: style.fillOpacity || 0.7
          });

          MapUtils.createCustomPopup(feature, circle, layerConfig.properties, layerName, currentCity);
          schoolLayer.addLayer(circle);
        });
      } catch (error) {
        console.warn('Error procesando escuela:', error);
      }
    });

    return schoolLayer;
  }

  // Crear capa estándar
  createStandardLayer(geojson, layerConfig, layerName) {
    if (layerName === 'Barrios') {
      this.applyNeighborhoodCounts();
    }

    const currentCity = this.mapManager.getCurrentCity();
    const options = {
      onEachFeature: (feature, layer) => {
        MapUtils.createCustomPopup(feature, layer, layerConfig.properties, layerName, currentCity);
      },
      style: function (feature) {
        return MapUtils.getLayerStyle(feature, layerName);
      }
    };

    if (layerConfig && layerConfig.heavy) {
      options.renderer = L.canvas({ padding: 0.5 });
    }

    return L.geoJSON(geojson, options);
  }

  featureCountOf(layerName) {
    const data = this.loadedLayers[layerName];
    if (!data || !data.geojson || !data.geojson.features) return 0;
    return data.geojson.features.length;
  }

  // Cargar capa (reutiliza GeoJSON cacheado; no crea la capa dos veces)
  async loadLayer(layerName, layerConfig) {
    const existing = this.loadedLayers[layerName];
    if (existing && existing.layer) {
      return this.featureCountOf(layerName);
    }
    if (this.inflightLayers[layerName]) {
      return this.inflightLayers[layerName];
    }

    const generation = this.layerGeneration;
    const createPromise = (async () => {
      try {
        let geojson = await this.fetchGeoJSON(layerConfig.file);
        if (generation !== this.layerGeneration) {
          throw new Error('Layer load cancelled');
        }

        if (this.loadedLayers[layerName] && this.loadedLayers[layerName].layer) {
          return this.featureCountOf(layerName);
        }

        if (layerConfig.joinFile) {
          geojson = await this.joinGeoJSONByProperty(
            geojson,
            layerConfig.joinFile,
            layerConfig.joinProperty || 'LINK'
          );
          if (generation !== this.layerGeneration) {
            throw new Error('Layer load cancelled');
          }
        }

        let layer;
        if (layerConfig.type === 'clustered') {
          layer = this.createClusteredLayer(geojson, layerConfig, layerName);
        } else if (layerName === 'Escuelas') {
          layer = this.createSchoolLayer(geojson, layerConfig, layerName);
        } else {
          layer = this.createStandardLayer(geojson, layerConfig, layerName);
        }

        if (generation !== this.layerGeneration) {
          throw new Error('Layer load cancelled');
        }

        const current = this.loadedLayers[layerName];
        if (current && current.layer) {
          const map = this.mapManager.getMap();
          if (map && map.hasLayer(current.layer)) {
            return this.featureCountOf(layerName);
          }
        }

        this.loadedLayers[layerName] = {
          layer: layer,
          geojson: geojson,
          config: layerConfig
        };

        return geojson.features.length;
      } catch (error) {
        if (generation !== this.layerGeneration || (error && error.message === 'Layer load cancelled')) {
          throw error;
        }
        console.error(`Error loading layer ${layerName}:`, error);
        throw error;
      }
    })();

    this.inflightLayers[layerName] = createPromise;
    try {
      return await createPromise;
    } finally {
      if (this.inflightLayers[layerName] === createPromise) {
        delete this.inflightLayers[layerName];
      }
    }
  }

  async joinGeoJSONByProperty(geojson, joinFile, joinProperty) {
    const extra = await this.fetchGeoJSON(joinFile);
    if (!geojson || !extra || !geojson.features || !extra.features) return geojson;

    const byKey = {};
    extra.features.forEach((feature) => {
      const key = feature.properties && feature.properties[joinProperty];
      if (key != null) byKey[key] = feature.properties;
    });

    geojson.features.forEach((feature) => {
      if (!feature.properties) return;
      const key = feature.properties[joinProperty];
      const src = key != null ? byKey[key] : null;
      if (!src) return;
      Object.keys(src).forEach((prop) => {
        if (feature.properties[prop] == null && src[prop] != null) {
          feature.properties[prop] = src[prop];
        }
      });
    });

    return geojson;
  }

  // Añadir capa al mapa
  async addLayerToMap(layerName) {
    if (this.loadedLayers[layerName]) {
      this.loadedLayers[layerName].layer.addTo(this.mapManager.getMap());
      this.pushLegendLayer(layerName);
      this.updateLegend(layerName);

      if (layerName === 'Barrios') {
        await this.loadCountingLayers();
      }

      if (this.isCountingLayer(layerName) &&
          this.loadedLayers['Barrios'] &&
          this.mapManager.getMap().hasLayer(this.loadedLayers['Barrios'].layer) &&
          this.countingCalculated) {
        this.refreshBarriosLayer();
      }
    }
  }

  // Refrescar capa de barrios para actualizar contadores
  refreshBarriosLayer() {
    if (!this.loadedLayers['Barrios']) return;

    const barriosLayer = this.loadedLayers['Barrios'];
    const map = this.mapManager.getMap();
    if (!map.hasLayer(barriosLayer.layer)) return;

    this.applyNeighborhoodCounts();

    map.removeLayer(barriosLayer.layer);
    const newLayer = this.createStandardLayer(barriosLayer.geojson, barriosLayer.config, 'Barrios');
    this.loadedLayers['Barrios'].layer = newLayer;
    newLayer.addTo(map);
  }

  // Remover capa del mapa
  removeLayerFromMap(layerName) {
    if (!this.loadedLayers[layerName]) return;

    const map = this.mapManager.getMap();
    if (!this.loadedLayers[layerName].config.hidden && map.hasLayer(this.loadedLayers[layerName].layer)) {
      map.removeLayer(this.loadedLayers[layerName].layer);
      this.legendStack = this.legendStack.filter((name) => name !== layerName);
      this.restoreTopLegend();
    }

    if (layerName === 'Barrios') {
      this.unloadCountingLayers();
      this.resetCountingState();
    }
  }

  // Cargar datos necesarios para conteo (GeoJSON only; no crea capas visibles)
  async loadCountingLayers() {
    const generation = this.layerGeneration;
    const currentCity = this.mapManager.getCurrentCity();
    const cityConfig = CITIES_CONFIG[currentCity];
    const layersToLoad = COUNTING_LAYER_NAMES;

    await Promise.all(layersToLoad.map(async (layerName) => {
      const config = cityConfig.layers[layerName];
      if (!config) return;
      try {
        await this.fetchGeoJSON(config.file);
      } catch (error) {
        console.warn(`Error cargando datos de ${layerName}:`, error);
      }
    }));

    if (generation !== this.layerGeneration) return;

    this.hideHiddenLayers();
    this.applyNeighborhoodCounts();
    this.refreshBarriosLayer();
    this.countingCalculated = true;
  }

  // Descargar las capas de conteo
  unloadCountingLayers() {
    // Solo descargar capas ocultas de conteo. Escuelas y Comisarías son capas de usuario.
    const layersToUnload = ['Manzanas_Puntos'];

    layersToUnload.forEach((layerName) => {
      if (!this.loadedLayers[layerName]) return;
      const map = this.mapManager.getMap();
      if (map.hasLayer(this.loadedLayers[layerName].layer)) {
        map.removeLayer(this.loadedLayers[layerName].layer);
      }
      delete this.loadedLayers[layerName];
    });
  }

  // Limpiar capas ocultas que estén visibles
  hideHiddenLayers() {
    Object.entries(this.loadedLayers).forEach(([layerName, layerData]) => {
      if (layerData.config.hidden && this.mapManager.getMap().hasLayer(layerData.layer)) {
        this.mapManager.getMap().removeLayer(layerData.layer);
      }
    });
  }

  // Limpiar todas las capas
  clearAllLayers() {
    this.layerGeneration++;
    const map = this.mapManager.getMap();
    Object.values(this.loadedLayers).forEach(({ layer }) => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    this.loadedLayers = {};
    this.geojsonCache = {};
    this.inflightFetches = {};
    this.inflightLayers = {};
    this.legendStack = [];
    this.resetCountingState();
    this.removeLegend();
  }

  // Actualizar leyenda
  updateLegend(layerName) {
    this.removeLegend();

    if (!this.loadedLayers[layerName]) return;

    this.currentLegend = L.control({ position: 'bottomright' });
    this.currentLegend.onAdd = (map) => {
      const div = L.DomUtil.create('div', 'legend');
      const currentCity = this.mapManager.getCurrentCity();
      let content = `<div class="legend-title"><i class="${CITIES_CONFIG[currentCity].layers[layerName].icon}"></i> ${layerName}</div>`;

      if (layerName === 'Calles') {
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.calles['pavimentado']}"></div>
          Pavimentado
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.calles['no pavimento']}"></div>
          No pavimento
        </div>`;
      } else if (layerName.includes('Población')) {
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.mas_hombres}"></div>
          Más varones
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.mas_mujeres}"></div>
          Más mujeres
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.equilibrado}"></div>
          Equilibrado (±5%)
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.genero.sin_datos}"></div>
          Sin datos
        </div>`;

        if (currentCity === 'va') {
          content += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Villa Ángela:</strong> Datos del Censo 2022 por radio censal
          </div>`;
        } else if (currentCity === 'sp') {
          content += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Saenz Peña:</strong> Datos del Censo 2022 por radio censal
          </div>`;
        } else if (currentCity === 'gr') {
          content += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Gran Resistencia:</strong> Datos del Censo 2022 por radio censal
          </div>`;
        }
      } else if (layerName === 'Barrios') {
        const labels = new Map();
        this.loadedLayers[layerName].geojson.features.forEach(f => {
          const key = MapUtils.getNeighborhoodKey(f.properties);
          if (labels.has(key)) return;
          const nombre = (f.properties && (f.properties.nombre || f.properties.Barrio)) || 'Sin nombre';
          const muni = f.properties && (f.properties.Municipio || f.properties.municipio);
          labels.set(key, muni ? `${nombre} (${muni})` : nombre);
        });
        Array.from(labels.entries()).slice(0, 8).forEach(([key, label]) => {
          content += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(key, COLOR_PALETTES.barrios)}"></div>
            ${label}
          </div>`;
        });
        if (labels.size > 8) content += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
      } else if (layerName === 'Asentamientos') {
        const nombres = new Set();
        this.loadedLayers[layerName].geojson.features.forEach(f => {
          if (f.properties && f.properties.Barrios) nombres.add(f.properties.Barrios);
        });
        Array.from(nombres).slice(0, 6).forEach(nombre => {
          content += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(nombre, COLOR_PALETTES.asentamientos)}"></div>
            ${nombre}
          </div>`;
        });
        if (nombres.size > 6) content += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
      } else if (layerName.includes('Circuito')) {
        const circuitos = new Set();
        this.loadedLayers[layerName].geojson.features.forEach(f => {
          const circuito = f.properties && (f.properties.CIRC_ELECT || f.properties.circuito || f.properties.CIRC);
          if (circuito) circuitos.add(circuito);
        });
        Array.from(circuitos).slice(0, 8).forEach(circuito => {
          content += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(circuito, COLOR_PALETTES.circuitos)}"></div>
            Circuito ${circuito}
          </div>`;
        });
        if (circuitos.size > 8) content += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
      } else if (layerName === 'Escuelas') {
        const escuelasGeo = this.loadedLayers[layerName].geojson;
        const hasLevels = !!(escuelasGeo && escuelasGeo.features &&
          escuelasGeo.features.some((f) => MapUtils.hasSchoolLevelFields(f.properties)));

        if (!hasLevels) {
          content += `<div class="legend-item">
            <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.default};border-radius:50%;width:12px;height:12px;"></div>
            Escuelas (mesas electorales)
          </div>`;
          content += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
            <strong>Establecimientos con mesas:</strong> mismos datos que Mesas/Electores por Escuela<br>
            <small>No es un catálogo completo de instituciones educativas</small>
          </div>`;
        } else {
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.infantes_primario};border-radius:50%;width:12px;height:12px;"></div>
          Jardín + Primario
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.solo_secundario};border-radius:50%;width:12px;height:12px;"></div>
          Solo Secundario
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.solo_primario};border-radius:50%;width:12px;height:12px;"></div>
          Solo Primario
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.solo_infantes};border-radius:50%;width:12px;height:12px;"></div>
          Solo Jardín
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.sin_niveles};border-radius:50%;width:12px;height:12px;"></div>
          Sin niveles definidos
        </div>`;

        content += `<div style="margin-top:15px;font-weight:bold;color:#333;">Instituciones especiales:</div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.biblioteca};border-radius:50%;width:12px;height:12px;"></div>
          📚 Bibliotecas
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.centro_educacion_fisica};border-radius:50%;width:12px;height:12px;"></div>
          ⚽ Centros de Educación Física
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.instituto_especializado};border-radius:50%;width:12px;height:12px;"></div>
          🎨 Institutos Especializados
        </div>`;
        content += `<div class="legend-item">
          <div class="legend-color" style="background:${COLOR_PALETTES.escuelas.educacion_adultos};border-radius:50%;width:12px;height:12px;"></div>
          👨‍🎓 Educación para Adultos
        </div>`;

        const fromPadron = !!(escuelasGeo && escuelasGeo.features &&
          escuelasGeo.features.some((f) => f.properties && f.properties.fuente_padron));
        content += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
          <strong>Instituciones Educativas:</strong> Clasificación por tipo y niveles<br>
          <small>${fromPadron
            ? 'Niveles y contacto: Padrón Oficial 2025 (DIE). Puntos: establecimientos con mesas electorales.'
            : 'Incluye escuelas tradicionales e instituciones especiales'}</small>
        </div>`;
        }
      }

      div.innerHTML = content;
      return div;
    };
    this.currentLegend.addTo(this.mapManager.getMap());
  }

  // Remover leyenda
  removeLegend() {
    if (this.currentLegend) {
      this.mapManager.getMap().removeControl(this.currentLegend);
      this.currentLegend = null;
    }
  }

  pushLegendLayer(layerName) {
    this.legendStack = this.legendStack.filter((name) => name !== layerName);
    this.legendStack.push(layerName);
  }

  restoreTopLegend() {
    const map = this.mapManager.getMap();
    while (this.legendStack.length) {
      const name = this.legendStack[this.legendStack.length - 1];
      const data = this.loadedLayers[name];
      if (data && data.layer && !data.config.hidden && map.hasLayer(data.layer)) {
        this.updateLegend(name);
        return;
      }
      this.legendStack.pop();
    }
    this.removeLegend();
  }

  extractLatLng(geometry) {
    const points = this.extractAllLatLngs(geometry);
    return points.length ? points[0] : null;
  }

  extractAllLatLngs(geometry) {
    if (!geometry || !geometry.coordinates) return [];

    const toLatLng = (coords) => {
      if (!coords || coords.length < 2) return null;
      const lat = coords[1];
      const lng = coords[0];
      if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
        return null;
      }
      return [lat, lng];
    };

    if (geometry.type === 'Point') {
      const pt = toLatLng(geometry.coordinates);
      return pt ? [pt] : [];
    }

    if (geometry.type === 'MultiPoint') {
      const points = [];
      const coords = geometry.coordinates || [];
      for (let i = 0; i < coords.length; i++) {
        const pt = toLatLng(coords[i]);
        if (pt) points.push(pt);
      }
      return points;
    }

    return [];
  }

  ringToLatLng(ring) {
    const coords = new Array(ring.length);
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (let i = 0; i < ring.length; i++) {
      const lat = ring[i][1];
      const lng = ring[i][0];
      coords[i] = [lat, lng];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    return { coords, minLat, maxLat, minLng, maxLng };
  }

  getNeighborhoodIndex() {
    if (this._neighborhoodIndex) return this._neighborhoodIndex;

    const geo = this.getLayerGeoJSON('Barrios');
    if (!geo) return null;

    this._neighborhoodIndex = geo.features.map((neighborhood) => {
      const key = MapUtils.getNeighborhoodKey(neighborhood.properties);
      const rings = [];
      const geom = neighborhood.geometry;
      if (!geom) return { key, rings };

      let polygons = [];
      if (geom.type === 'Polygon') {
        polygons = [geom.coordinates];
      } else if (geom.type === 'MultiPolygon') {
        polygons = geom.coordinates;
      }

      for (let p = 0; p < polygons.length; p++) {
        const poly = polygons[p];
        const outer = poly && poly[0];
        if (!outer || outer.length < 3) continue;

        const ring = this.ringToLatLng(outer);
        const holes = [];
        for (let h = 1; h < poly.length; h++) {
          if (poly[h] && poly[h].length >= 3) {
            holes.push(this.ringToLatLng(poly[h]).coords);
          }
        }
        ring.holes = holes;
        rings.push(ring);
      }

      return { key, rings };
    });

    return this._neighborhoodIndex;
  }

  countPointsInNeighborhoods(features) {
    const index = this.getNeighborhoodIndex();
    if (!index || !features) return null;

    const counts = {};
    for (let i = 0; i < index.length; i++) {
      counts[index[i].key] = 0;
    }

    for (let f = 0; f < features.length; f++) {
      const points = this.extractAllLatLngs(features[f].geometry);
      for (let p = 0; p < points.length; p++) {
        const pt = points[p];
        const lat = pt[0];
        const lng = pt[1];

        // Recorre de atrás hacia adelante para preservar "último barrio gana" si hay solape.
        for (let n = index.length - 1; n >= 0; n--) {
          const neighborhood = index[n];
          let inside = false;
          for (let r = 0; r < neighborhood.rings.length; r++) {
            const ring = neighborhood.rings[r];
            if (lat < ring.minLat || lat > ring.maxLat || lng < ring.minLng || lng > ring.maxLng) {
              continue;
            }
            if (!this.isPointInPolygon(pt, ring.coords)) continue;

            let inHole = false;
            const holes = ring.holes || [];
            for (let h = 0; h < holes.length; h++) {
              if (this.isPointInPolygon(pt, holes[h])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) {
              inside = true;
              break;
            }
          }
          if (inside) {
            counts[neighborhood.key]++;
            break;
          }
        }
      }
    }

    return counts;
  }

  countBlocksPerNeighborhood() {
    if (this.countingCache.blocks) return this.countingCache.blocks;
    const blocks = this.getLayerGeoJSON('Manzanas_Puntos');
    const neighborhoods = this.getLayerGeoJSON('Barrios');
    if (!blocks || !neighborhoods) return null;
    this.countingCache.blocks = this.countPointsInNeighborhoods(blocks.features);
    return this.countingCache.blocks;
  }

  countPoliceStationsPerNeighborhood() {
    if (this.countingCache.police) return this.countingCache.police;
    const police = this.getLayerGeoJSON('Comisarias');
    const neighborhoods = this.getLayerGeoJSON('Barrios');
    if (!police || !neighborhoods) return null;
    this.countingCache.police = this.countPointsInNeighborhoods(police.features);
    return this.countingCache.police;
  }

  countSchoolsPerNeighborhood() {
    if (this.countingCache.schools) return this.countingCache.schools;
    const schools = this.getLayerGeoJSON('Escuelas');
    const neighborhoods = this.getLayerGeoJSON('Barrios');
    if (!schools || !neighborhoods) return null;
    this.countingCache.schools = this.countPointsInNeighborhoods(schools.features);
    return this.countingCache.schools;
  }

  applyNeighborhoodCounts() {
    const barrios = this.getLayerGeoJSON('Barrios');
    if (!barrios) return;

    const hasSchools = this.hasCountingDataset('Escuelas');
    const hasPolice = this.hasCountingDataset('Comisarias');
    const hasBlocks = this.hasCountingDataset('Manzanas_Puntos');
    if (!hasSchools && !hasPolice && !hasBlocks) return;

    const schoolCounts = hasSchools ? this.countSchoolsPerNeighborhood() : null;
    const policeCounts = hasPolice ? this.countPoliceStationsPerNeighborhood() : null;
    const blockCounts = hasBlocks ? this.countBlocksPerNeighborhood() : null;

    for (let i = 0; i < barrios.features.length; i++) {
      const feature = barrios.features[i];
      if (!feature.properties) feature.properties = {};
      const key = MapUtils.getNeighborhoodKey(feature.properties);
      if (schoolCounts) feature.properties.schoolCount = schoolCounts[key] || 0;
      if (policeCounts) feature.properties.policeCount = policeCounts[key] || 0;
      if (blockCounts) feature.properties.blockCount = blockCounts[key] || 0;
    }
  }

  calculateCentroid(coordinates) {
    let x = 0, y = 0;
    coordinates.forEach(coord => {
      x += coord[0];
      y += coord[1];
    });
    return [y / coordinates.length, x / coordinates.length];
  }

  calculateDistance(point1, point2) {
    const R = 6371;
    const dLat = this.toRadians(point2[0] - point1[0]);
    const dLng = this.toRadians(point2[1] - point1[1]);
    const lat1 = this.toRadians(point1[0]);
    const lat2 = this.toRadians(point2[0]);

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  isPointInPolygon(point, polygon) {
    if (!point || !polygon || polygon.length < 3) {
      return false;
    }

    const x = point[0], y = point[1];
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  getLoadedLayers() {
    return this.loadedLayers;
  }
}
