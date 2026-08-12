// Módulo de manejo del mapa
class MapManager {
  constructor() {
    this.map = null;
    this.currentCity = 'sp';
  }

  // Inicializar el mapa
  init() {
    const cityConfig = CITIES_CONFIG[this.currentCity];
    
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('map').setView(cityConfig.center, cityConfig.zoom);

    // Capa base con múltiples opciones
    const baseMaps = {
      "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }),
      "Satelital": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
      }),
      "Topográfico": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors'
      })
    };

    baseMaps["OpenStreetMap"].addTo(this.map);
    L.control.layers(baseMaps).addTo(this.map);

    // Mover controles de zoom para evitar solapamiento con nuestro panel
    this.map.zoomControl.setPosition('topright');

    document.getElementById('loading').style.display = 'none';
    return this.map;
  }

  // Cambiar vista a una ciudad específica
  switchToCity(cityKey) {
    const cityConfig = CITIES_CONFIG[cityKey];
    this.currentCity = cityKey;
    this.map.setView(cityConfig.center, cityConfig.zoom);
  }

  // Obtener instancia del mapa
  getMap() {
    return this.map;
  }

  // Obtener ciudad actual
  getCurrentCity() {
    return this.currentCity;
  }
}

// Utilidades
class MapUtils {
  // Función para obtener color por hash
  static getColorByHash(value, palette) {
    if (!value) return palette[0];
    let hash = 0;
    for (let i = 0; i < String(value).length; i++) {
      hash = String(value).charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  }

  static getNeighborhoodKey(properties) {
    if (!properties) return 'Sin nombre';
    const name = properties.nombre || properties.Barrio || 'Sin nombre';
    const municipio = properties.Municipio || properties.municipio || '';
    const id = properties.ID != null ? properties.ID : (properties.id != null ? properties.id : '');
    if (municipio && id !== '') return `${name}::${municipio}::${id}`;
    if (municipio) return `${name}::${municipio}`;
    if (id !== '') return `${name}::${id}`;
    return String(name);
  }

  static hasSchoolLevelFields(properties) {
    if (!properties) return false;
    return Object.prototype.hasOwnProperty.call(properties, 'nvcjinfantes') ||
           Object.prototype.hasOwnProperty.call(properties, 'nvcprimario') ||
           Object.prototype.hasOwnProperty.call(properties, 'nvcsecundario') ||
           Object.prototype.hasOwnProperty.call(properties, 'nvcjmaternal');
  }

  // HTML del popup (se evalúa al abrir, así los conteos de Barrios quedan frescos)
  static buildPopupContent(feature, properties, layerName, currentCity) {
    let content = `<div class="popup-title"><i class="${CITIES_CONFIG[currentCity].layers[layerName].icon}"></i> ${layerName}</div>`;
    
    const layerTranslations = TRANSLATIONS[layerName] || {};
    
    // Manejo especial para capa de población por radio
    if (layerName.includes('Población')) {
      let total = 0;
      let mujeres = 0;
      let varones = 0;
      let viviendas=0;
      // Para Saenz Peña
      if (feature.properties.hasOwnProperty('Datos x _1')) {
        mujeres = Number(feature.properties['Datos x _1']) || 0;
        varones = Number(feature.properties['Datos x _2']) || 0;
        total = Number(feature.properties['Datos x ra']) || 0;
        viviendas = Number(feature.properties['Datos x _3']) || 0;
      }
      // Para Villa Ángela y Gran Resistencia
      else if (feature.properties.hasOwnProperty('2022Mujere')) {
        mujeres = Number(feature.properties['2022Mujere']) || 0;
        varones = Number(feature.properties['2022Varone']) || 0;
        total = Number(feature.properties['2022Total']) || 0;
        viviendas = Number(feature.properties['2022Total_']) || 0;
      }
      
      
      content += `<div class="popup-item">
        <span class="popup-label">Total población:</span> 
        <span class="popup-value">${total}</span>
      </div>`;
      content += `<div class="popup-item">
        <span class="popup-label">Mujeres:</span> 
        <span class="popup-value">${mujeres}</span>
      </div>`;
      content += `<div class="popup-item">
        <span class="popup-label">Varones:</span> 
        <span class="popup-value">${varones}</span>
      </div>`;
      content += `<div class="popup-item">
        <span class="popup-label">Viviendas:</span> 
        <span class="popup-value">${viviendas}</span>
      </div>`;
      if (total > 0) {
        const porcentajeMujeres = ((mujeres / total) * 100).toFixed(1);
        const porcentajeVarones = ((varones / total) * 100).toFixed(1);
        content += `<div class="popup-item">
          <span class="popup-label">Distribución:</span> 
          <span class="popup-value">${porcentajeMujeres}% / ${porcentajeVarones}%</span>
        </div>`;
      }
      
      // Agregar información del radio censal
      /*if (feature.properties.LINK) {
        content += `<div class="popup-item">
          <span class="popup-label">Radio censal:</span> 
          <span class="popup-value">${feature.properties.LINK}</span>
        </div>`;
      }*/
      
      if (feature.properties.AREA) {
        //const areaKm2 = (feature.properties.AREA / 1000000).toFixed(2);
        const areaKm2=feature.properties.AREA.toFixed(2);
        content += `<div class="popup-item">
          <span class="popup-label">Área:</span> 
          <span class="popup-value">${areaKm2}</span>
        </div>`;
      }
      
      return content;
    }

    // Manejo especial para capa de escuelas (catálogo SP con niveles).
    // GR/VA usan el padrón de mesas: popup genérico con nombre/circuito/mesas/electores.
    if (layerName === 'Escuelas' && MapUtils.hasSchoolLevelFields(feature.properties)) {
      // Agrupar todos los campos relacionados con cada nivel
      const infantes = (Number(feature.properties.nvcjinfantes) || 0) + 
                      (Number(feature.properties.nvcjmaternal) || 0) +
                      (Number(feature.properties.nvejinfantes) || 0) +
                      (Number(feature.properties.nvhinicial) || 0);
      
      const primario = (Number(feature.properties.nvcprimario) || 0) + 
                      (Number(feature.properties.nveprimario) || 0) +
                      (Number(feature.properties.nvaprimario) || 0) +
                      (Number(feature.properties.nvhprimario) || 0);
      
      const secundario = (Number(feature.properties.nvcsecundario) || 0) + 
                        (Number(feature.properties.nvcsecundinet) || 0) +
                        (Number(feature.properties.nvesecundario) || 0) +
                        (Number(feature.properties.nvasecundario) || 0) +
                        (Number(feature.properties.nvhsecundario) || 0);
      
      // Información básica
      content += `<div class="popup-item">
        <span class="popup-label">Nombre:</span> 
        <span class="popup-value">${feature.properties.nombre || 'Sin nombre'}</span>
      </div>`;
      
      if (feature.properties.domicilio) {
        content += `<div class="popup-item">
          <span class="popup-label">Domicilio:</span> 
          <span class="popup-value">${feature.properties.domicilio}</span>
        </div>`;
      }
      
      if (feature.properties.sector) {
        content += `<div class="popup-item">
          <span class="popup-label">Sector:</span> 
          <span class="popup-value">${feature.properties.sector}</span>
        </div>`;
      }
      
      // Detectar tipo de institución
      const nombre = (feature.properties.nombre || '').toLowerCase();
      const tallerArtist = Number(feature.properties.tallerartist) || 0;
      const educacionAdultos = Number(feature.properties.nveadultos) || 0;
      const primarioAdultos = Number(feature.properties.nvaprimario) || 0;
      
      // Mostrar tipo de institución
      content += `<div class="popup-item">
        <span class="popup-label">Tipo de institución:</span> 
        <span class="popup-value"></span>
      </div>`;
      
      if (nombre.includes('biblioteca')) {
        content += `<div class="popup-item" style="margin-left: 15px;">
          <span class="popup-label">📚 Biblioteca</span> 
        </div>`;
      } else if (nombre.includes('centro de educacion fisica') || nombre.includes('educacion fisica')) {
        content += `<div class="popup-item" style="margin-left: 15px;">
          <span class="popup-label">⚽ Centro de Educación Física</span> 
        </div>`;
      } else if (tallerArtist > 0 || nombre.includes('instituto') || nombre.includes('i.s.p.e.a')) {
        content += `<div class="popup-item" style="margin-left: 15px;">
          <span class="popup-label">🎨 Instituto Especializado</span> 
        </div>`;
      } else if (educacionAdultos > 0 || primarioAdultos > 0 || nombre.includes('e.p.a')) {
        content += `<div class="popup-item" style="margin-left: 15px;">
          <span class="popup-label">👨‍🎓 Educación para Adultos</span> 
        </div>`;
      } else {
        // Niveles educativos tradicionales
        content += `<div class="popup-item" style="margin-left: 15px;">
          <span class="popup-label">🏫 Escuela</span> 
        </div>`;
        
        if (infantes) {
          content += `<div class="popup-item" style="margin-left: 30px;">
            <span class="popup-label">• Jardín de Infantes</span> 
          </div>`;
        }
        
        if (primario) {
          content += `<div class="popup-item" style="margin-left: 30px;">
            <span class="popup-label">• Primario</span> 
          </div>`;
        }
        
        if (secundario) {
          content += `<div class="popup-item" style="margin-left: 30px;">
            <span class="popup-label">• Secundario</span> 
          </div>`;
        }
        
        if (!infantes && !primario && !secundario) {
          content += `<div class="popup-item" style="margin-left: 30px;">
            <span class="popup-value" style="color: #999;">Sin niveles definidos</span>
          </div>`;
        }
      }
      
      // CUE/Anexo si está disponible
      if (feature.properties.cueanexo) {
        content += `<div class="popup-item">
          <span class="popup-label">CUE/Anexo:</span> 
          <span class="popup-value">${feature.properties.cueanexo}</span>
        </div>`;
      }

      if (feature.properties.telefono) {
        content += `<div class="popup-item">
          <span class="popup-label">Teléfono:</span>
          <span class="popup-value">${feature.properties.telefono}</span>
        </div>`;
      }
      if (feature.properties.email) {
        content += `<div class="popup-item">
          <span class="popup-label">Email:</span>
          <span class="popup-value">${feature.properties.email}</span>
        </div>`;
      }
      if (feature.properties.circuito != null && feature.properties.circuito !== '') {
        content += `<div class="popup-item">
          <span class="popup-label">Circuito:</span>
          <span class="popup-value">${feature.properties.circuito}</span>
        </div>`;
      }
      const mesas = feature.properties.cn_mesas ?? feature.properties.CuentaDeNU;
      const electores = feature.properties.electores ?? feature.properties.SumaDeCuen;
      if (mesas != null && mesas !== '') {
        content += `<div class="popup-item">
          <span class="popup-label">Mesas:</span>
          <span class="popup-value">${mesas}</span>
        </div>`;
      }
      if (electores != null && electores !== '') {
        content += `<div class="popup-item">
          <span class="popup-label">Electores:</span>
          <span class="popup-value">${electores}</span>
        </div>`;
      }
      
      return content;
    }

    // Manejo especial para barrios con contadores
    if (layerName === 'Barrios') {
      const layerManager = window.layerManager;
      if (layerManager && feature.properties.schoolCount === undefined &&
          feature.properties.policeCount === undefined &&
          feature.properties.blockCount === undefined) {
        layerManager.applyNeighborhoodCounts();
      }

      if (layerManager && layerManager.hasCountingDataset('Escuelas') &&
          feature.properties.schoolCount !== undefined) {
        const schoolCount = feature.properties.schoolCount;
        content += `<div class="popup-item">
          <span class="popup-label">🏫 Escuelas en el barrio:</span> 
          <span class="popup-value">${schoolCount}</span>
        </div>`;
      }
      
      if (layerManager && layerManager.hasCountingDataset('Comisarias') &&
          feature.properties.policeCount !== undefined) {
        const policeCount = feature.properties.policeCount;
        content += `<div class="popup-item">
          <span class="popup-label">🚔 Comisarías en el barrio:</span> 
          <span class="popup-value">${policeCount}</span>
        </div>`;
      }
      
      if (layerManager && layerManager.hasCountingDataset('Manzanas_Puntos') &&
          feature.properties.blockCount !== undefined) {
        const blockCount = feature.properties.blockCount;
        content += `<div class="popup-item">
          <span class="popup-label">🏘️ Manzanas en el barrio:</span> 
          <span class="popup-value">${blockCount}</span>
        </div>`;
      }
    }
    
    // Para otras capas, usar el comportamiento estándar
    properties.forEach(prop => {
      let value = feature.properties[prop];
      
      // Manejo de valores especiales
      if (layerName === 'Lugares públicos' && prop === 'name' && (!value || value === "")) {
        value = "Plaza";
      }
      if (layerName === 'Calles' && prop === 'superclas'  && value === 'desconocido') {
        value = "No pavimento";
      }
      
      const label = layerTranslations[prop] || prop;
      
      if (value !== undefined && value !== null && value !== "") {
        content += `<div class="popup-item">
          <span class="popup-label">${label}:</span> 
          <span class="popup-value">${value}</span>
        </div>`;
      }
    });
    
    return content;
  }

  static createCustomPopup(feature, layer, properties, layerName, currentCity) {
    const maxWidth = layerName === 'Escuelas' ? 350 : 300;
    layer.bindPopup(() => MapUtils.buildPopupContent(feature, properties, layerName, currentCity), {
      className: 'custom-popup',
      maxWidth
    });
  }

  // Obtener estilo para diferentes tipos de capas
  static getLayerStyle(feature, layerName) {
    if (layerName === "Calles") {
      let tipo = feature.properties.superclas  || feature.properties.surface || feature.properties.highway;

      // Mejorar la lógica para detectar pavimentación
      let clasificacion = "no pavimento"; // valor por defecto
      
      if (tipo) {
        // Verificar si está pavimentado
        if (tipo === "paved" || 
            tipo === "pavimentado" ||
            tipo === "Pavimentado" ||
            tipo === "asphalt" || 
            tipo === "concrete" ||
            tipo === "primary" ||
            tipo === "secondary" ||
            tipo === "trunk" ||
            tipo === "tertiary") {
          clasificacion = "pavimentado";
        } else if (tipo === "unpaved" || 
                   tipo === "desconocido" ||
                   tipo === "residential" ||
                   tipo === "unclassified" ||
                   tipo === "service") {
          // Para residential y otros tipos, usar color intermedio
          clasificacion = tipo === "unpaved" ? "no pavimento" : "pavimentado";
        }
      }
      
      return {
        color: COLOR_PALETTES.calles[clasificacion] || "#757575",
        weight: 3,
        opacity: 0.8
      };
    } else if (layerName.includes('Radio') || layerName.includes('Población')) {
      // Lógica especial para datos de población con género
      if (layerName.includes('Población')) {
        // Buscar campos de población en diferentes formatos según la ciudad
        let mujeres = 0;
        let varones = 0;
        
        // Para Saenz Peña
        if (feature.properties.hasOwnProperty('Datos x _1')) {
          mujeres = Number(feature.properties['Datos x _1']) || 0;
          varones = Number(feature.properties['Datos x _2']) || 0;
        }
        // Para Villa Ángela y Gran Resistencia
        else if (feature.properties.hasOwnProperty('2022Mujere')) {
          mujeres = Number(feature.properties['2022Mujere']) || 0;
          varones = Number(feature.properties['2022Varone']) || 0;
        }

        let color = COLOR_PALETTES.genero.sin_datos;
        
        if (mujeres > 0 || varones > 0) {
          const total = mujeres + varones;
          
          if (total > 0) {
            const diferencia = Math.abs(mujeres - varones);
            const porcentajeDiferencia = (diferencia / total) * 100;
            
            if (porcentajeDiferencia < 5) {
              color = COLOR_PALETTES.genero.equilibrado;
            } else if (varones > mujeres) {
              color = COLOR_PALETTES.genero.mas_hombres;
            } else {
              color = COLOR_PALETTES.genero.mas_mujeres;
            }
          }
        }
        
        return {
          color: color,
          fillColor: color,
          weight: 2,
          fillOpacity: 0.6,
          opacity: 0.8
        };
      } else {
        // Para radios censales normales
        const radioId = feature.properties.RADIO || feature.properties.RADIO2020 || feature.properties.LINK;
        return {
          color: MapUtils.getColorByHash(radioId, COLOR_PALETTES.radios),
          weight: 2,
          fillOpacity: 0.4,
          opacity: 0.8
        };
      }
    } else if (layerName === 'Barrios') {
      const nombreBarrio = MapUtils.getNeighborhoodKey(feature.properties);
      const layerManager = window.layerManager;
      // Contar una sola vez (cacheado). No exige que Escuelas/Comisarías estén visibles.
      if (layerManager &&
          feature.properties.schoolCount === undefined &&
          feature.properties.policeCount === undefined &&
          feature.properties.blockCount === undefined) {
        layerManager.applyNeighborhoodCounts();
      }

      return {
        color: MapUtils.getColorByHash(nombreBarrio, COLOR_PALETTES.barrios),
        weight: 2,
        fillOpacity: 0.4,
        opacity: 0.8
      };
    } else if (layerName === 'Asentamientos') {
      const nombreAsentamiento = feature.properties.Barrios || feature.properties.nombre_bar;
      return {
        color: MapUtils.getColorByHash(nombreAsentamiento, COLOR_PALETTES.asentamientos),
        weight: 2,
        fillOpacity: 0.5,
        opacity: 0.8
      };
    } else if (layerName.includes('Circuito')) {
      const circuitoId = feature.properties.CIRC_ELECT || feature.properties.circuito || feature.properties.CIRC;
      return {
        color: MapUtils.getColorByHash(circuitoId, COLOR_PALETTES.circuitos),
        weight: 2,
        fillOpacity: 0.4,
        opacity: 0.8
      };
    } else if (layerName === 'Escuelas') {
      if (!MapUtils.hasSchoolLevelFields(feature.properties)) {
        const color = COLOR_PALETTES.escuelas.default || '#1976D2';
        return {
          color: color,
          fillColor: color,
          weight: 2,
          fillOpacity: 0.7,
          opacity: 0.9,
          radius: 8
        };
      }

      // Lógica simplificada para escuelas - agrupar todos los campos relacionados
      const infantes = (Number(feature.properties.nvcjinfantes) || 0) + 
                      (Number(feature.properties.nvcjmaternal) || 0) +
                      (Number(feature.properties.nvejinfantes) || 0) +
                      (Number(feature.properties.nvhinicial) || 0);
      
      const primario = (Number(feature.properties.nvcprimario) || 0) + 
                      (Number(feature.properties.nveprimario) || 0) +
                      (Number(feature.properties.nvaprimario) || 0) +
                      (Number(feature.properties.nvhprimario) || 0);
      
      const secundario = (Number(feature.properties.nvcsecundario) || 0) + 
                        (Number(feature.properties.nvcsecundinet) || 0) +
                        (Number(feature.properties.nvesecundario) || 0) +
                        (Number(feature.properties.nvasecundario) || 0) +
                        (Number(feature.properties.nvhsecundario) || 0);
      
      let color = COLOR_PALETTES.escuelas.sin_niveles;
      
      // Detectar tipos especiales de instituciones
      const nombre = (feature.properties.nombre || '').toLowerCase();
      const tallerArtist = Number(feature.properties.tallerartist) || 0;
      const educacionAdultos = Number(feature.properties.nveadultos) || 0;
      const primarioAdultos = Number(feature.properties.nvaprimario) || 0;
      
      // Clasificar por tipo especial primero
      if (nombre.includes('biblioteca')) {
        color = COLOR_PALETTES.escuelas.biblioteca;
      } else if (nombre.includes('centro de educacion fisica') || nombre.includes('educacion fisica')) {
        color = COLOR_PALETTES.escuelas.centro_educacion_fisica;
      } else if (tallerArtist > 0 || nombre.includes('instituto') || nombre.includes('i.s.p.e.a')) {
        color = COLOR_PALETTES.escuelas.instituto_especializado;
      } else if (educacionAdultos > 0 || primarioAdultos > 0 || nombre.includes('e.p.a')) {
        color = COLOR_PALETTES.escuelas.educacion_adultos;
      } else {
        // Determinar el tipo de escuela basado en los niveles (simplificado)
        if (infantes > 0 && primario > 0) {
          color = COLOR_PALETTES.escuelas.infantes_primario;
        } else if (secundario > 0) {
          color = COLOR_PALETTES.escuelas.solo_secundario;
        } else if (primario > 0) {
          color = COLOR_PALETTES.escuelas.solo_primario;
        } else if (infantes > 0) {
          color = COLOR_PALETTES.escuelas.solo_infantes;
        }
      }
      
      return {
        color: color,
        fillColor: color,
        weight: 2,
        fillOpacity: 0.7,
        opacity: 0.9,
        radius: 8
      };
    }
    
    return {
      color: '#667eea',
      weight: 2,
      fillOpacity: 0.3,
      opacity: 0.7
    };
  }
}
