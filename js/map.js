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

  // Crear popup personalizado
  static createCustomPopup(feature, layer, properties, layerName, currentCity) {
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
        console.log('Popup usando formato Saenz Peña:', { mujeres, varones, total, viviendas });
      }
      // Para Villa Ángela y Gran Resistencia
      else if (feature.properties.hasOwnProperty('2022Mujere')) {
        mujeres = Number(feature.properties['2022Mujere']) || 0;
        varones = Number(feature.properties['2022Varone']) || 0;
        total = Number(feature.properties['2022Total']) || 0;
        viviendas = Number(feature.properties['2022Total_']) || 0;
        console.log('Popup usando formato Villa Ángela:', { mujeres, varones, total, viviendas });
      }
      else {
        console.log('Popup: No se encontró formato de datos reconocido');
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
      
      return layer.bindPopup(content, {
        className: 'custom-popup',
        maxWidth: 300
      });
    }
    
    // Manejo especial para capa de escuelas
    if (layerName === 'Escuelas') {
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
      
      return layer.bindPopup(content, {
        className: 'custom-popup',
        maxWidth: 350
      });
    }
    
    // Manejo especial para barrios con contadores
    if (layerName === 'Barrios') {
      if (feature.properties.schoolCount !== undefined) {
        const schoolCount = feature.properties.schoolCount;
        content += `<div class="popup-item">
          <span class="popup-label">🏫 Escuelas en el barrio:</span> 
          <span class="popup-value">${schoolCount}</span>
        </div>`;
      }
      
      if (feature.properties.policeCount !== undefined) {
        const policeCount = feature.properties.policeCount;
        content += `<div class="popup-item">
          <span class="popup-label">🚔 Comisarías en el barrio:</span> 
          <span class="popup-value">${policeCount}</span>
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
    
    layer.bindPopup(content, {
      className: 'custom-popup',
      maxWidth: 300
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
          console.log('Usando formato Saenz Peña:', { mujeres, varones });
        }
        // Para Villa Ángela y Gran Resistencia
        else if (feature.properties.hasOwnProperty('2022Mujere')) {
          mujeres = Number(feature.properties['2022Mujere']) || 0;
          varones = Number(feature.properties['2022Varone']) || 0;
          console.log('Usando formato Villa Ángela:', { mujeres, varones });
        }
        else {
          console.log('No se encontró formato de datos reconocido');
        }
        
        console.log('Valores finales:', { mujeres, varones, total: mujeres + varones });
        
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
      const nombreBarrio = feature.properties.nombre || feature.properties.Barrio;
      
      // Verificar si hay escuelas cargadas para mostrar contador
      const layerManager = window.layerManager; // Acceso global al layer manager
      let schoolCount = 0;
      
      if (layerManager && layerManager.getLoadedLayers()['Escuelas']) {
        const schoolCounts = layerManager.countSchoolsPerNeighborhood();
        if (schoolCounts) {
          schoolCount = schoolCounts[nombreBarrio] || 0;
        }
      }
      
      // Contar comisarías si la capa está cargada
      let policeCount = 0;
      if (layerManager && layerManager.getLoadedLayers()['Comisarias']) {
        const policeCounts = layerManager.countPoliceStationsPerNeighborhood();
        if (policeCounts) {
          policeCount = policeCounts[nombreBarrio] || 0;
        }
      }
      
      // Agregar los contadores como propiedades del feature
      feature.properties.schoolCount = schoolCount;
      feature.properties.policeCount = policeCount;
      
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
