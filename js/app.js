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

document.addEventListener('DOMContentLoaded', function () {
  const startMap = () => {
    const app = new MapApp();
    app.init();
    window.layerManager = app.layerManager;
    window.mapApp = app;
  };

  const gate = new AuthGate({
    publishableKey: typeof CLERK_PUBLISHABLE_KEY !== 'undefined' ? CLERK_PUBLISHABLE_KEY : '',
    onAuthenticated: startMap,
  });

  gate.init().catch((err) => {
    console.error('Clerk auth failed', err);
    const errorEl = document.getElementById('auth-gate-error');
    const gateEl = document.getElementById('auth-gate');
    if (gateEl) gateEl.hidden = false;
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent =
        'No se pudo iniciar Clerk. Verificá la publishable key y que este origen esté permitido en el Dashboard.';
    }
  });
});
