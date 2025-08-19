// Módulo de manejo de capas
class LayerManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.loadedLayers = {};
    this.currentLegend = null;
  }

  // Crear marcador clusterizado
  createClusteredLayer(geojson, layerConfig, layerName) {
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: function (cluster) {
        let total = 0;
        let count = 0;
        
        cluster.getAllChildMarkers().forEach(marker => {
          const value = marker.feature.properties[layerConfig.valueProperty];
          if (value) {
            total += parseInt(value);
            count++;
          }
        });
        
        const avg = count > 0 ? total / count : 0;
        const color = total > avg ? '#d32f2f' : '#1976d2';
        
        return L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${total}</div>`,
          className: '',
          iconSize: [40, 40]
        });
      }
    });
    
    geojson.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const latlng = L.latLng(coords[1], coords[0]);
      const value = feature.properties[layerConfig.valueProperty] || 0;
      
      const marker = L.marker(latlng, {
        icon: L.divIcon({
          html: `<div style="background:#667eea;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${value}</div>`,
          className: '',
          iconSize: [32, 32]
        })
      });
      
      marker.feature = feature;
      MapUtils.createCustomPopup(feature, marker, layerConfig.properties, layerName, this.mapManager.getCurrentCity());
      clusterGroup.addLayer(marker);
    });
    
    return clusterGroup;
  }

  // Crear capa estándar
  createStandardLayer(geojson, layerConfig, layerName) {
    return L.geoJSON(geojson, {
      onEachFeature: (feature, layer) => {
        MapUtils.createCustomPopup(feature, layer, layerConfig.properties, layerName, this.mapManager.getCurrentCity());
      },
      style: function(feature) {
        return MapUtils.getLayerStyle(feature, layerName);
      }
    });
  }

  // Cargar capa
  async loadLayer(layerName, layerConfig) {
    try {
      const currentCity = this.mapManager.getCurrentCity();
      const response = await fetch(CITIES_CONFIG[currentCity].dataPath + layerConfig.file);
      if (!response.ok) throw new Error(`Error loading ${layerName}`);
      
      const geojson = await response.json();
      
      let layer;
      if (layerConfig.type === 'clustered') {
        layer = this.createClusteredLayer(geojson, layerConfig, layerName);
      } else {
        layer = this.createStandardLayer(geojson, layerConfig, layerName);
      }
      
      this.loadedLayers[layerName] = {
        layer: layer,
        geojson: geojson,
        config: layerConfig
      };
      
      return geojson.features.length;
    } catch (error) {
      console.error(`Error loading layer ${layerName}:`, error);
      return 0;
    }
  }

  // Añadir capa al mapa
  addLayerToMap(layerName) {
    if (this.loadedLayers[layerName]) {
      this.loadedLayers[layerName].layer.addTo(this.mapManager.getMap());
      this.updateLegend(layerName);
    }
  }

  // Remover capa del mapa
  removeLayerFromMap(layerName) {
    if (this.loadedLayers[layerName]) {
      this.mapManager.getMap().removeLayer(this.loadedLayers[layerName].layer);
      this.removeLegend();
    }
  }

  // Limpiar todas las capas
  clearAllLayers() {
    Object.values(this.loadedLayers).forEach(({ layer }) => {
      this.mapManager.getMap().removeLayer(layer);
    });
    this.loadedLayers = {};
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
      } else if (layerName === 'Barrios') {
        const nombres = new Set();
        this.loadedLayers[layerName].geojson.features.forEach(f => {
          const nombre = f.properties && (f.properties.nombre || f.properties.Barrio);
          if (nombre) nombres.add(nombre);
        });
        Array.from(nombres).slice(0, 8).forEach(nombre => {
          content += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(nombre, COLOR_PALETTES.barrios)}"></div>
            ${nombre}
          </div>`;
        });
        if (nombres.size > 8) content += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
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
          const circuito = f.properties && (f.properties.CIRC_ELECT || f.properties.circuito);
          if (circuito) circuitos.add(circuito);
        });
        Array.from(circuitos).slice(0, 8).forEach(circuito => {
          content += `<div class="legend-item">
            <div class="legend-color" style="background:${MapUtils.getColorByHash(circuito, COLOR_PALETTES.circuitos)}"></div>
            Circuito ${circuito}
          </div>`;
        });
        if (circuitos.size > 8) content += '<div style="text-align:center;color:#718096;font-size:0.75rem;">...</div>';
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

  // Obtener capas cargadas
  getLoadedLayers() {
    return this.loadedLayers;
  }
} 