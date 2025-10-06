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
        
        try {
          cluster.getAllChildMarkers().forEach(marker => {
            if (marker && marker.feature && marker.feature.properties) {
              const value = marker.feature.properties[layerConfig.valueProperty];
              if (value && !isNaN(parseInt(value))) {
                total += parseInt(value);
                count++;
              }
            }
          });
          
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
      // Agregar opciones adicionales para evitar problemas
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });
    
    geojson.features.forEach(feature => {
      try {
        let coords;
        
        // Manejar diferentes tipos de geometría
        if (feature.geometry.type === 'Point') {
          coords = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'MultiPoint') {
          // Para MultiPoint, usar el primer punto
          coords = feature.geometry.coordinates[0];
        } else {
          console.warn('Tipo de geometría no soportado:', feature.geometry.type);
          return;
        }
        
        // Validar que las coordenadas existen y son números
        if (!coords || coords.length < 2 || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
          console.warn('Coordenadas inválidas:', coords, 'en feature:', feature.properties);
          return;
        }
        
        // Validar que las coordenadas están en rango válido
        if (Math.abs(coords[1]) > 90 || Math.abs(coords[0]) > 180) {
          console.warn('Coordenadas fuera de rango:', coords, 'en feature:', feature.properties);
          return;
        }
        
        // Validación más estricta de coordenadas
        const lat = parseFloat(coords[1]);
        const lng = parseFloat(coords[0]);
        
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
          console.warn('Coordenadas no numéricas:', { lat, lng, coords }, 'en feature:', feature.properties);
          return;
        }
        
        let latlng;
        try {
          latlng = L.latLng(lat, lng);
        } catch (error) {
          console.warn('Error creando LatLng:', error, { lat, lng }, 'en feature:', feature.properties);
          return;
        }
        
        const value = feature.properties[layerConfig.valueProperty] || 0;
        
        let marker;
        try {
          marker = L.marker(latlng, {
            icon: L.divIcon({
              html: `<div style="background:#667eea;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);">${value}</div>`,
              className: '',
              iconSize: [32, 32]
            })
          });
        } catch (error) {
          console.warn('Error creando marker:', error, { lat, lng, value }, 'en feature:', feature.properties);
          return;
        }
        
        marker.feature = feature;
        
        try {
          MapUtils.createCustomPopup(feature, marker, layerConfig.properties, layerName, this.mapManager.getCurrentCity());
          clusterGroup.addLayer(marker);
        } catch (error) {
          console.warn('Error agregando marker al cluster:', error, 'en feature:', feature.properties);
        }
      } catch (error) {
        console.warn('Error procesando feature de mesas electorales:', error, feature);
      }
    });
    
    return clusterGroup;
  }

  // Crear capa de escuelas con círculos coloreados
  createSchoolLayer(geojson, layerConfig, layerName) {
    const schoolLayer = L.layerGroup();
    
    geojson.features.forEach(feature => {
      try {
        let coords;
        
        // Manejar diferentes tipos de geometría
        if (feature.geometry.type === 'Point') {
          coords = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'MultiPoint') {
          // Para MultiPoint, usar el primer punto
          coords = feature.geometry.coordinates[0];
        } else {
          console.warn('Tipo de geometría no soportado para escuelas:', feature.geometry.type);
          return;
        }
        
        // Validar coordenadas
        if (!coords || coords.length < 2 || typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
          console.warn('Coordenadas inválidas para escuela:', coords);
          return;
        }
        
        const lat = parseFloat(coords[1]);
        const lng = parseFloat(coords[0]);
        
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
          console.warn('Coordenadas no numéricas para escuela:', { lat, lng });
          return;
        }
        
        // Obtener estilo para la escuela
        const style = MapUtils.getLayerStyle(feature, layerName);
        
        // Crear círculo coloreado
        const circle = L.circleMarker([lat, lng], {
          radius: style.radius || 8,
          fillColor: style.fillColor,
          color: style.color,
          weight: style.weight || 2,
          opacity: style.opacity || 0.9,
          fillOpacity: style.fillOpacity || 0.7
        });
        
        // Agregar popup
        MapUtils.createCustomPopup(feature, circle, layerConfig.properties, layerName, this.mapManager.getCurrentCity());
        
        schoolLayer.addLayer(circle);
      } catch (error) {
        console.warn('Error procesando escuela:', error, feature);
      }
    });
    
    return schoolLayer;
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

  // Función de debug para validar GeoJSON
  debugGeoJSON(geojson, layerName) {
    console.log(`🔍 Analizando ${layerName}:`, {
      totalFeatures: geojson.features.length,
      firstFeature: geojson.features[0]
    });
    
    let validFeatures = 0;
    let invalidFeatures = 0;
    
    geojson.features.forEach((feature, index) => {
      if (!feature.geometry || !feature.geometry.coordinates) {
        console.warn(`Feature ${index} sin coordenadas:`, feature);
        invalidFeatures++;
        return;
      }
      
      let coords;
      if (feature.geometry.type === 'Point') {
        coords = feature.geometry.coordinates;
      } else if (feature.geometry.type === 'MultiPoint') {
        coords = feature.geometry.coordinates[0];
      }
      
      if (!coords || coords.length < 2) {
        console.warn(`Feature ${index} con coordenadas inválidas:`, coords);
        invalidFeatures++;
        return;
      }
      
      const lat = parseFloat(coords[1]);
      const lng = parseFloat(coords[0]);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.warn(`Feature ${index} con coordenadas NaN:`, { lat, lng, coords });
        invalidFeatures++;
        return;
      }
      
      validFeatures++;
    });
    
    console.log(`✅ ${validFeatures} válidas, ❌ ${invalidFeatures} inválidas`);
  }

  // Cargar capa
  async loadLayer(layerName, layerConfig) {
    try {
      const currentCity = this.mapManager.getCurrentCity();
      const response = await fetch(CITIES_CONFIG[currentCity].dataPath + layerConfig.file);
      if (!response.ok) throw new Error(`Error loading ${layerName}`);
      
      const geojson = await response.json();
      
      // Debug para capas clusterizadas problemáticas
      if (layerConfig.type === 'clustered' && currentCity === 'gr') {
        this.debugGeoJSON(geojson, layerName);
      }
      
      let layer;
      if (layerConfig.type === 'clustered') {
        layer = this.createClusteredLayer(geojson, layerConfig, layerName);
      } else if (layerName === 'Escuelas') {
        layer = this.createSchoolLayer(geojson, layerConfig, layerName);
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
      // Debug para capas ocultas
      if (this.loadedLayers[layerName].config.hidden) {
        console.log(`🚫 Capa ${layerName} está oculta - NO se agregará al mapa`);
        return;
      }
      
      // Solo agregar al mapa si la capa no está oculta
      this.loadedLayers[layerName].layer.addTo(this.mapManager.getMap());
      this.updateLegend(layerName);
      
      // Si se agrega la capa de Barrios, cargar automáticamente las capas necesarias para conteo
      if (layerName === 'Barrios') {
        this.loadCountingLayers();
      }
      
      // Si se agrega la capa de escuelas, comisarías o manzanas, actualizar estilos de barrios
      if ((layerName === 'Escuelas' || layerName === 'Comisarias' || layerName === 'Manzanas' || layerName === 'Manzanas_Puntos') && this.loadedLayers['Barrios']) {
        this.refreshBarriosLayer();
      }
    }
  }

  // Refrescar capa de barrios para actualizar contadores de escuelas
  refreshBarriosLayer() {
    if (this.loadedLayers['Barrios']) {
      const barriosLayer = this.loadedLayers['Barrios'];
      const map = this.mapManager.getMap();
      
      // Solo refrescar si la capa de Barrios ya está visible en el mapa
      if (map.hasLayer(barriosLayer.layer)) {
        // Remover la capa actual
        map.removeLayer(barriosLayer.layer);
        
        // Recrear la capa con los nuevos estilos
        const newLayer = this.createStandardLayer(barriosLayer.geojson, barriosLayer.config, 'Barrios');
        
        // Actualizar la referencia
        this.loadedLayers['Barrios'].layer = newLayer;
        
        // Agregar la nueva capa al mapa
        newLayer.addTo(map);
      }
    }
  }

  // Remover capa del mapa
  removeLayerFromMap(layerName) {
    if (this.loadedLayers[layerName]) {
      // Solo remover del mapa si la capa no está oculta y está visible
      if (!this.loadedLayers[layerName].config.hidden && this.mapManager.getMap().hasLayer(this.loadedLayers[layerName].layer)) {
        this.mapManager.getMap().removeLayer(this.loadedLayers[layerName].layer);
        this.removeLegend();
      }
      
      // Si se remueve la capa de Barrios, remover también las capas de conteo
      if (layerName === 'Barrios') {
        this.unloadCountingLayers();
      }
      
      // Si se remueve la capa de escuelas, comisarías o manzanas, actualizar estilos de barrios
      if ((layerName === 'Escuelas' || layerName === 'Comisarias' || layerName === 'Manzanas' || layerName === 'Manzanas_Puntos') && this.loadedLayers['Barrios']) {
        this.refreshBarriosLayer();
      }
    }
  }

  // Cargar automáticamente las capas necesarias para conteo
  async loadCountingLayers() {
    const currentCity = this.mapManager.getCurrentCity();
    const cityConfig = CITIES_CONFIG[currentCity];
    const layersToLoad = ['Manzanas_Puntos', 'Escuelas', 'Comisarias'];
    
    console.log('🔄 Cargando capas automáticamente para conteo...');
    
    for (const layerName of layersToLoad) {
      if (cityConfig.layers[layerName] && !this.loadedLayers[layerName]) {
        try {
          console.log(`📥 Cargando ${layerName}...`);
          await this.loadLayer(layerName, cityConfig.layers[layerName]);
          console.log(`✅ ${layerName} cargada exitosamente`);
          
          // Si la capa está marcada como oculta, asegurarse de que no esté visible
          if (cityConfig.layers[layerName].hidden && this.mapManager.getMap().hasLayer(this.loadedLayers[layerName].layer)) {
            console.log(`🚫 Removiendo ${layerName} del mapa (capa oculta)`);
            this.mapManager.getMap().removeLayer(this.loadedLayers[layerName].layer);
          }
        } catch (error) {
          console.warn(`⚠️ Error cargando ${layerName}:`, error);
        }
      }
    }
    
    // Asegurarse de que las capas ocultas no estén visibles
    this.hideHiddenLayers();
    
    // Refrescar barrios para actualizar contadores
    this.refreshBarriosLayer();
  }

  // Descargar las capas de conteo
  unloadCountingLayers() {
    const layersToUnload = ['Manzanas_Puntos', 'Escuelas', 'Comisarias'];
    
    console.log('🔄 Descargando capas de conteo...');
    
    layersToUnload.forEach(layerName => {
      if (this.loadedLayers[layerName]) {
        // Solo remover del mapa si está visible
        if (this.mapManager.getMap().hasLayer(this.loadedLayers[layerName].layer)) {
          this.mapManager.getMap().removeLayer(this.loadedLayers[layerName].layer);
        }
        // Eliminar de la lista de capas cargadas
        delete this.loadedLayers[layerName];
        console.log(`✅ ${layerName} descargada`);
      }
    });
  }

  // Limpiar capas ocultas que estén visibles
  hideHiddenLayers() {
    Object.entries(this.loadedLayers).forEach(([layerName, layerData]) => {
      if (layerData.config.hidden && this.mapManager.getMap().hasLayer(layerData.layer)) {
        console.log(`🚫 Removiendo capa oculta ${layerName} del mapa`);
        this.mapManager.getMap().removeLayer(layerData.layer);
      }
    });
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
        
        // Agregar información adicional sobre la capa
        const currentCity = this.mapManager.getCurrentCity();
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
        
        // Tipos especiales de instituciones
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
        
        // Agregar información adicional sobre la capa
        content += `<div style="margin-top:10px;padding:8px;background:#f8f9fa;border-radius:4px;font-size:0.8rem;color:#6c757d;">
          <strong>Instituciones Educativas:</strong> Clasificación por tipo y niveles<br>
          <small>Incluye escuelas tradicionales e instituciones especiales</small>
        </div>`;
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

  // Contar manzanas por barrio usando intersección punto-dentro-de-polígono
  countBlocksPerNeighborhood() {
    const blocksLayer = this.loadedLayers['Manzanas_Puntos'];
    const neighborhoodsLayer = this.loadedLayers['Barrios'];
    
    if (!blocksLayer || !neighborhoodsLayer) {
      console.log('❌ No se encontraron las capas necesarias para manzanas');
      return null;
    }
    
    const blocks = blocksLayer.geojson.features;
    const neighborhoods = neighborhoodsLayer.geojson.features;
    
    const blockCounts = {};
    
    console.log(`🔍 Analizando ${blocks.length} manzanas usando intersección punto-dentro-de-polígono`);
    
    // Debug de las primeras 3 manzanas para ver su estructura
    blocks.slice(0, 3).forEach((block, index) => {
      console.log(`🔍 Manzana ${index + 1}:`, {
        properties: block.properties,
        geometryType: block.geometry?.type,
        hasCoordinates: !!block.geometry?.coordinates
      });
    });
    
    // Inicializar contadores
    neighborhoods.forEach(neighborhood => {
      const neighborhoodName = neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre';
      blockCounts[neighborhoodName] = 0;
    });
    
    let blocksProcessed = 0;
    let blocksAssigned = 0;
    
    // Asignar cada manzana al barrio usando intersección punto-dentro-de-polígono
    blocks.forEach(block => {
      if (block.geometry && block.geometry.type === 'Point') {
        const blockPoint = block.geometry.coordinates;
        const blockLatLng = [blockPoint[1], blockPoint[0]]; // [lat, lng]
        blocksProcessed++;
        
        let assignedNeighborhood = null;
        
        // Buscar el barrio que contiene esta manzana
        neighborhoods.forEach(neighborhood => {
          if (neighborhood.geometry && (neighborhood.geometry.type === 'Polygon' || neighborhood.geometry.type === 'MultiPolygon')) {
            let coordinates;
            if (neighborhood.geometry.type === 'Polygon') {
              coordinates = neighborhood.geometry.coordinates[0];
            } else { // MultiPolygon
              coordinates = neighborhood.geometry.coordinates[0][0];
            }
            
            const neighborhoodName = neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre';
            
            // Convertir coordenadas del polígono de [lng, lat] a [lat, lng] para que coincidan con blockLatLng
            const polygonCoords = coordinates.map(coord => [coord[1], coord[0]]); // [lng, lat] -> [lat, lng]
            
            if (this.isPointInPolygon(blockLatLng, polygonCoords)) {
              assignedNeighborhood = neighborhoodName;
              
              // Debug para las primeras 5 manzanas
              if (blocksProcessed <= 5) {
                console.log(`🏘️ Manzana "${block.properties.DFRM || 'Sin ID'}" está DENTRO del barrio "${neighborhoodName}"`);
                console.log(`   Coordenadas manzana: [${blockLatLng[0]}, ${blockLatLng[1]}]`);
                console.log(`   Primeras 3 coordenadas barrio:`, polygonCoords.slice(0, 3));
              }
            }
          }
        });
        
        if (assignedNeighborhood) {
          blockCounts[assignedNeighborhood]++;
          blocksAssigned++;
        } else {
          if (blocksProcessed <= 5) {
            console.log(`❌ Manzana "${block.properties.DFRM || 'Sin ID'}" no está dentro de ningún barrio`);
            console.log(`   Coordenadas manzana: [${blockLatLng[0]}, ${blockLatLng[1]}]`);
            console.log(`   Propiedades manzana:`, block.properties);
          }
        }
      }
    });
    
    console.log(`📊 Resultado: ${blocksProcessed} manzanas procesadas, ${blocksAssigned} asignadas a barrios`);
    console.log('📈 Conteo de manzanas por barrio:', blockCounts);
    
    return blockCounts;
  }

  // Contar comisarías por barrio usando intersección punto-dentro-de-polígono
  countPoliceStationsPerNeighborhood() {
    const policeLayer = this.loadedLayers['Comisarias'];
    const neighborhoodsLayer = this.loadedLayers['Barrios'];
    
    if (!policeLayer || !neighborhoodsLayer) {
      console.log('❌ No se encontraron las capas necesarias para comisarías');
      return null;
    }
    
    const policeStations = policeLayer.geojson.features;
    const neighborhoods = neighborhoodsLayer.geojson.features;
    
    const policeCounts = {};
    
    console.log(`🔍 Analizando ${policeStations.length} comisarías usando intersección punto-dentro-de-polígono`);
    
    // Inicializar contadores
    neighborhoods.forEach(neighborhood => {
      const neighborhoodName = neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre';
      policeCounts[neighborhoodName] = 0;
    });
    
    let stationsProcessed = 0;
    let stationsAssigned = 0;
    
    // Asignar cada comisaría al barrio usando intersección punto-dentro-de-polígono
    policeStations.forEach(station => {
      if (station.geometry && station.geometry.type === 'Point') {
        const stationPoint = station.geometry.coordinates;
        const stationLatLng = [stationPoint[1], stationPoint[0]]; // [lat, lng]
        stationsProcessed++;
        
        let assignedNeighborhood = null;
        
        // Buscar el barrio que contiene esta comisaría
        neighborhoods.forEach(neighborhood => {
          if (neighborhood.geometry && (neighborhood.geometry.type === 'Polygon' || neighborhood.geometry.type === 'MultiPolygon')) {
            let coordinates;
            if (neighborhood.geometry.type === 'Polygon') {
              coordinates = neighborhood.geometry.coordinates[0];
            } else { // MultiPolygon
              coordinates = neighborhood.geometry.coordinates[0][0];
            }
            
            const neighborhoodName = neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre';
            
            // Convertir coordenadas del polígono de [lng, lat] a [lat, lng] para que coincidan con stationLatLng
            const polygonCoords = coordinates.map(coord => [coord[1], coord[0]]); // [lng, lat] -> [lat, lng]
            
            if (this.isPointInPolygon(stationLatLng, polygonCoords)) {
              assignedNeighborhood = neighborhoodName;
              
              // Debug para las primeras 5 comisarías
              if (stationsProcessed <= 5) {
                console.log(`🚔 Comisaría "${station.properties.Unidad || 'Sin nombre'}" está DENTRO del barrio "${neighborhoodName}"`);
              }
            }
          }
        });
        
        if (assignedNeighborhood) {
          policeCounts[assignedNeighborhood]++;
          stationsAssigned++;
        } else {
          if (stationsProcessed <= 5) {
            console.log(`❌ Comisaría "${station.properties.Unidad || 'Sin nombre'}" no está dentro de ningún barrio`);
          }
        }
      }
    });
    
    console.log(`📊 Resultado: ${stationsProcessed} comisarías procesadas, ${stationsAssigned} asignadas a barrios`);
    console.log('📈 Conteo de comisarías por barrio:', policeCounts);
    
    return policeCounts;
  }

  // Contar escuelas por barrio usando el barrio más cercano
  countSchoolsPerNeighborhood() {
    const schoolsLayer = this.loadedLayers['Escuelas'];
    const neighborhoodsLayer = this.loadedLayers['Barrios'];
    
    if (!schoolsLayer || !neighborhoodsLayer) {
      console.log('❌ No se encontraron las capas necesarias');
      return null;
    }
    
    const schools = schoolsLayer.geojson.features;
    const neighborhoods = neighborhoodsLayer.geojson.features;
    
    const schoolCounts = {};
    
    console.log(`🔍 Analizando ${schools.length} escuelas usando intersección punto-dentro-de-polígono`);
    
    // Debug: verificar si hay escuelas con múltiples puntos o nombres duplicados
    const schoolNames = {};
    const multiPointSchools = [];
    
    schools.forEach(school => {
      const name = school.properties.nombre || 'Sin nombre';
      if (schoolNames[name]) {
        schoolNames[name]++;
      } else {
        schoolNames[name] = 1;
      }
      
      if (school.geometry.type === 'MultiPoint' && school.geometry.coordinates.length > 1) {
        multiPointSchools.push({
          name: name,
          points: school.geometry.coordinates.length
        });
      }
    });
    
    const duplicateNames = Object.entries(schoolNames).filter(([name, count]) => count > 1);
    if (duplicateNames.length > 0) {
      console.log(`🔄 Escuelas con nombres duplicados:`, duplicateNames.slice(0, 5));
    }
    
    if (multiPointSchools.length > 0) {
      console.log(`📍 Escuelas con múltiples puntos:`, multiPointSchools.slice(0, 5));
    }
    
    // Inicializar contadores
    neighborhoods.forEach(neighborhood => {
      const neighborhoodName = neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre';
      schoolCounts[neighborhoodName] = 0;
    });
    
    let schoolsProcessed = 0;
    let schoolsAssigned = 0;
    
    // Debug: mostrar información de los primeros 3 barrios
    neighborhoods.slice(0, 3).forEach((neighborhood, index) => {
      console.log(`🔍 Barrio ${index + 1}:`, {
        nombre: neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre',
        geometryType: neighborhood.geometry?.type,
        hasCoordinates: !!neighborhood.geometry?.coordinates,
        coordinatesLength: neighborhood.geometry?.coordinates?.length
      });
    });
    
    // Asignar cada escuela al barrio usando intersección punto-dentro-de-polígono
    schools.forEach(school => {
      if (school.geometry && school.geometry.type === 'MultiPoint') {
        const schoolPoint = school.geometry.coordinates[0];
        const schoolLatLng = [schoolPoint[1], schoolPoint[0]]; // [lat, lng]
        schoolsProcessed++;
        
        let assignedNeighborhood = null;
        
        // Buscar el barrio que contiene esta escuela
        neighborhoods.forEach(neighborhood => {
          if (neighborhood.geometry && (neighborhood.geometry.type === 'Polygon' || neighborhood.geometry.type === 'MultiPolygon')) {
            let coordinates;
            if (neighborhood.geometry.type === 'Polygon') {
              coordinates = neighborhood.geometry.coordinates[0];
            } else { // MultiPolygon
              coordinates = neighborhood.geometry.coordinates[0][0];
            }
            
            const neighborhoodName = neighborhood.properties.nombre || neighborhood.properties.Barrio || 'Sin nombre';
            
            // Debug detallado para las primeras 3 escuelas y primeros 2 barrios
            if (schoolsProcessed <= 3 && (neighborhoodName === 'Matadero' || neighborhoodName === 'Domingo F. Sarmiento')) {
              console.log(`🔍 Probando escuela "${school.properties.nombre}" en barrio "${neighborhoodName}"`);
              console.log(`   Coordenadas escuela: [${schoolLatLng[0]}, ${schoolLatLng[1]}]`);
              console.log(`   Estructura completa del polígono:`, neighborhood.geometry);
              console.log(`   Coordenadas extraídas:`, coordinates);
              console.log(`   Primeras 3 coordenadas del polígono:`, coordinates.slice(0, 3));
              console.log(`   Total coordenadas del polígono:`, coordinates.length);
              
              // Test con coordenadas invertidas
              const testPoint = [schoolLatLng[1], schoolLatLng[0]]; // [lng, lat]
              const testResult = this.isPointInPolygon(testPoint, coordinates);
              console.log(`   Test con coordenadas invertidas [${testPoint[0]}, ${testPoint[1]}]: ${testResult}`);
              
              // Test con coordenadas del polígono invertidas (formato correcto)
              const invertedPolygon = coordinates.map(coord => [coord[1], coord[0]]);
              const testResult2 = this.isPointInPolygon(schoolLatLng, invertedPolygon);
              console.log(`   Test con polígono en formato correcto [lat,lng]: ${testResult2}`);
              
              // Test usando Leaflet directamente
              try {
                const leafletPolygon = L.polygon(coordinates.map(coord => [coord[1], coord[0]]));
                const leafletPoint = L.latLng(schoolLatLng[0], schoolLatLng[1]);
                const leafletResult = leafletPolygon.getBounds().contains(leafletPoint);
                console.log(`   Test con Leaflet bounds: ${leafletResult}`);
              } catch (error) {
                console.log(`   Error en test Leaflet:`, error.message);
              }
            }
            
            // Convertir coordenadas del polígono de [lng, lat] a [lat, lng] para que coincidan con schoolLatLng
            const polygonCoords = coordinates.map(coord => [coord[1], coord[0]]); // [lng, lat] -> [lat, lng]
            
            if (this.isPointInPolygon(schoolLatLng, polygonCoords)) {
              assignedNeighborhood = neighborhoodName;
              
              // Debug para las primeras 5 escuelas
              if (schoolsProcessed <= 5) {
                console.log(`✅ Escuela "${school.properties.nombre}" está DENTRO del barrio "${neighborhoodName}"`);
              }
            } else if (schoolsProcessed <= 3 && (neighborhoodName === 'Matadero' || neighborhoodName === 'Domingo F. Sarmiento')) {
              console.log(`❌ Escuela "${school.properties.nombre}" NO está dentro del barrio "${neighborhoodName}"`);
            }
          }
        });
        
        if (assignedNeighborhood) {
          schoolCounts[assignedNeighborhood]++;
          schoolsAssigned++;
          
          // Debug para barrios específicos (primeras 5 escuelas por barrio)
          if (!this.debugCounts) this.debugCounts = {};
          if (!this.debugCounts[assignedNeighborhood]) this.debugCounts[assignedNeighborhood] = 0;
          this.debugCounts[assignedNeighborhood]++;
          
          if (this.debugCounts[assignedNeighborhood] <= 5) {
            console.log(`🏫 ${assignedNeighborhood}: Escuela "${school.properties.nombre}" (dentro del polígono)`);
          }
        } else {
          if (schoolsProcessed <= 5) {
            console.log(`❌ Escuela "${school.properties.nombre}" no está dentro de ningún barrio`);
          }
        }
      }
    });
    
    console.log(`📊 Resultado: ${schoolsProcessed} escuelas procesadas, ${schoolsAssigned} asignadas a barrios (usando intersección punto-dentro-de-polígono)`);
    console.log('📈 Conteo por barrio:', schoolCounts);
    
    // Mostrar resumen de los barrios con más escuelas
    const sortedCounts = Object.entries(schoolCounts)
      .filter(([name, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedCounts.length > 0) {
      console.log('🏆 Top 10 barrios con más escuelas:');
      sortedCounts.forEach(([name, count]) => {
        console.log(`   ${name}: ${count} escuelas`);
      });
    }
    
    return schoolCounts;
  }
  
  // Calcular centroide de un polígono
  calculateCentroid(coordinates) {
    let x = 0, y = 0;
    coordinates.forEach(coord => {
      x += coord[0]; // lng
      y += coord[1]; // lat
    });
    return [y / coordinates.length, x / coordinates.length]; // [lat, lng]
  }
  
  // Calcular distancia entre dos puntos en kilómetros (fórmula de Haversine)
  calculateDistance(point1, point2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(point2[0] - point1[0]);
    const dLng = this.toRadians(point2[1] - point1[1]);
    const lat1 = this.toRadians(point1[0]);
    const lat2 = this.toRadians(point2[0]);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.sin(dLng/2) * Math.sin(dLng/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  // Convertir grados a radianes
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Función para verificar si un punto está dentro de un polígono
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

  // Obtener capas cargadas
  getLoadedLayers() {
    return this.loadedLayers;
  }
} 