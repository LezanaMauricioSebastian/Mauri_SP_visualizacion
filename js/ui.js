// Módulo de interfaz de usuario
class UIManager {
  constructor(mapManager, layerManager) {
    this.mapManager = mapManager;
    this.layerManager = layerManager;
  }

  // Crear controles de capas
  createLayerControls() {
    const controlsDiv = document.getElementById('layer-controls');
    controlsDiv.innerHTML = '';
    
    const currentCity = this.mapManager.getCurrentCity();
    const cityConfig = CITIES_CONFIG[currentCity];
    const groups = {};
    
    // Agrupar capas (excluyendo las ocultas)
    Object.entries(cityConfig.layers).forEach(([name, config]) => {
      // Saltar capas ocultas
      if (config.hidden) {
        return;
      }
      
      if (!groups[config.group]) {
        groups[config.group] = [];
      }
      groups[config.group].push({ name, config });
    });
    
    // Crear controles por grupo
    Object.entries(groups).forEach(([groupName, layers]) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'layer-group';
      
      const groupTitle = document.createElement('div');
      groupTitle.className = 'layer-group-title';
      groupTitle.textContent = groupName;
      groupDiv.appendChild(groupTitle);
      
      layers.forEach(({ name, config }) => {
        const itemDiv = this.createLayerControlItem(name, config);
        groupDiv.appendChild(itemDiv);
        
        // Conteo sin crear capas Leaflet (las pesadas usan featureCount)
        this.layerManager.getFeatureCount(name, config).then(count => {
          const countSpan = itemDiv.querySelector('.layer-count');
          if (countSpan) {
            countSpan.textContent = count.toLocaleString();
          }
        }).catch(() => {
          const countSpan = itemDiv.querySelector('.layer-count');
          if (countSpan) {
            countSpan.textContent = '—';
          }
        });
      });
      
      controlsDiv.appendChild(groupDiv);
    });

    this.layerManager.prefetchIdleLayerData();
  }

  // Crear item de control individual
  createLayerControlItem(name, config) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'layer-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'layer-checkbox';
    checkbox.id = `layer-${name}`;
    
    const label = document.createElement('label');
    label.className = 'layer-label';
    label.htmlFor = `layer-${name}`;
    label.innerHTML = `<i class="${config.icon}"></i> ${name}`;
    
    const countSpan = document.createElement('span');
    countSpan.className = 'layer-count';
    countSpan.textContent = '...';
    
    // Event listener para checkbox
    checkbox.addEventListener('change', async (event) => {
      await this.handleLayerToggle(event.target, name, config, countSpan);
    });
    
    itemDiv.appendChild(checkbox);
    itemDiv.appendChild(label);
    itemDiv.appendChild(countSpan);
    
    return itemDiv;
  }

  // Manejar toggle de capas
  async handleLayerToggle(checkbox, name, config, countSpan) {
    if (checkbox.checked) {
      const cityWhenStarted = this.mapManager.getCurrentCity();
      const stillCurrent = () => (
        checkbox.checked && this.mapManager.getCurrentCity() === cityWhenStarted
      );
      const loadedLayers = this.layerManager.getLoadedLayers();
      if (!loadedLayers[name]) {
        countSpan.textContent = 'Cargando...';
        try {
          const count = await this.layerManager.loadLayer(name, config);
          if (!stillCurrent()) {
            if (typeof count === 'number') countSpan.textContent = count.toLocaleString();
            return;
          }
          countSpan.textContent = count.toLocaleString();
        } catch (error) {
          if (!stillCurrent() || (error && error.message === 'Layer load cancelled')) return;
          checkbox.checked = false;
          countSpan.textContent = 'Error';
          return;
        }
      }

      if (!stillCurrent()) return;
      await this.layerManager.addLayerToMap(name);
    } else {
      this.layerManager.removeLayerFromMap(name);
    }
  }

  // Cambiar ciudad
  switchCity(cityKey) {
    if (cityKey === this.mapManager.getCurrentCity()) return;
    
    // Limpiar capas cargadas
    this.layerManager.clearAllLayers();
    
    // Actualizar vista del mapa
    this.mapManager.switchToCity(cityKey);
    
    // Actualizar botones
    document.querySelectorAll('.city-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.city === cityKey);
    });
    
    // Recrear controles
    this.createLayerControls();
    
    // Actualizar título
    const cityConfig = CITIES_CONFIG[cityKey];
    document.querySelector('.logo h1').textContent = `Mapa Interactivo - ${cityConfig.name}`;
  }

  // Configurar event listeners
  setupEventListeners() {
    // Selector de ciudad
    document.querySelectorAll('.city-option').forEach(btn => {
      btn.addEventListener('click', () => this.switchCity(btn.dataset.city));
    });
    this.setupPanelCollapse();
  }

  setupPanelCollapse() {
    const panel = document.getElementById('controls-panel');
    const btn = document.getElementById('controls-collapse-btn');
    if (!panel || !btn) return;

    const apply = (collapsed) => {
      panel.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('title', collapsed ? 'Expandir' : 'Contraer');
    };

    let collapsed = false;
    try {
      collapsed = localStorage.getItem('mauri_sp_layers_collapsed') === '1';
    } catch (e) { /* ignore */ }

    apply(collapsed);

    btn.addEventListener('click', () => {
      const next = !panel.classList.contains('collapsed');
      apply(next);
      try {
        localStorage.setItem('mauri_sp_layers_collapsed', next ? '1' : '0');
      } catch (e) { /* ignore */ }
    });
  }

  // Inicializar interfaz
  init() {
    this.createLayerControls();
    this.setupEventListeners();
  }
}
