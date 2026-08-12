// Aplicación principal
class MapApp {
  constructor() {
    this.mapManager = null;
    this.layerManager = null;
    this.uiManager = null;
    this.questionsManager = null;
  }

  // Inicializar la aplicación
  init() {
    const params = QuestionsManager.readUrlParams();

    // Inicializar módulos
    this.mapManager = new MapManager();
    if (params.city) this.mapManager.currentCity = params.city;
    this.layerManager = new LayerManager(this.mapManager);
    this.uiManager = new UIManager(this.mapManager, this.layerManager);
    this.questionsManager = new QuestionsManager(this.mapManager, this.layerManager, this.uiManager);
    this.uiManager.questionsManager = this.questionsManager;

    // Inicializar mapa
    this.mapManager.init();

    // Inicializar interfaz
    this.uiManager.init();
    this.questionsManager.init();

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