// Módulo de manejo de capas
const COUNTING_LAYER_NAMES = ['Escuelas', 'Comisarias', 'Manzanas_Puntos'];

class LayerManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.loadedLayers = {};
    this.geojsonCache = {};
    this.inflightFetches = {};
    this.inflightLayers = {};
    this.layerGeneration = 0;
    this.counts = new NeighborhoodCounts({
      getGeoJSON: (name) => this.getLayerGeoJSON(name),
      hasDataset: (name) => this.hasCountingDataset(name)
    });
    this.legend = new LegendManager(mapManager, () => this.loadedLayers);
  }

  get countingCalculated() {
    return this.counts.calculated;
  }

  set countingCalculated(value) {
    this.counts.calculated = value;
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
    this.counts.reset();
  }

  applyNeighborhoodCounts() {
    this.counts.apply();
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
        const latlng = SpatialUtils.extractLatLng(feature.geometry);
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
        const points = SpatialUtils.extractAllLatLngs(feature.geometry);
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
      this.legend.push(layerName);
      this.legend.update(layerName);

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
      this.legend.drop(layerName);
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
    this.resetCountingState();
    this.legend.clear();
  }

  getLoadedLayers() {
    return this.loadedLayers;
  }
}
