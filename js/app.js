// Aplicación principal
class MapApp {
  constructor() {
    this.mapManager = null;
    this.layerManager = null;
    this.uiManager = null;
  }

  // Inicializar la aplicación
  init() {
    // Inicializar módulos
    this.mapManager = new MapManager();
    this.layerManager = new LayerManager(this.mapManager);
    this.uiManager = new UIManager(this.mapManager, this.layerManager);

    // Inicializar mapa
    this.mapManager.init();

    // Inicializar interfaz
    this.uiManager.init();

    console.log('🗺️ Mapa Interactivo del Chaco iniciado correctamente');
  }
}

// Event listener para inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  const app = new MapApp();
  app.init();
  
  // Hacer el layerManager accesible globalmente para las funciones de estilo
  window.layerManager = app.layerManager;
}); 