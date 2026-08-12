// Modo Preguntas: orquesta análisis electoral, ranking y URL
const CIRCUIT_LAYER_NAME = 'Circuito electoral';
const MESAS_LAYER_NAME = 'Mesas por Escuela';

class QuestionsManager {
  constructor(mapManager, layerManager, uiManager) {
    this.mapManager = mapManager;
    this.layerManager = layerManager;
    this.uiManager = uiManager;
    this.tab = 'questions';
    this.currentQuestionId = null;
    this.analysisGeneration = 0;
    this.agg = null;
    this.breaks = [];
    this.fields = null;
    this.metric = null;
    this.selectedId = null;
    this.circuitLayer = null;
    this.schoolLayer = null;
    this.circuitLayersById = {};
    this.schoolMarkersByKey = {};
  }

  static readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const city = params.get('city');
    const question = params.get('q');
    const mode = params.get('mode');
    return {
      city: city && CITIES_CONFIG[city] ? city : null,
      question: question || null,
      mode: mode === 'layers' ? 'layers' : 'questions'
    };
  }

  writeUrl() {
    const params = new URLSearchParams();
    params.set('city', this.mapManager.getCurrentCity());
    if (this.tab === 'layers') {
      params.set('mode', 'layers');
    } else if (this.currentQuestionId) {
      params.set('q', this.currentQuestionId);
    }
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
    window.history.replaceState({}, '', next);
  }

  init() {
    this.renderCards();
    this.setupTabs();
    this.setupRankingCollapse();
    const params = QuestionsManager.readUrlParams();
    if (params.mode === 'layers') {
      this.setTab('layers', { skipUrl: true });
    } else {
      this.setTab('questions', { skipUrl: true });
      if (params.question && this.questionForCity(params.question)) {
        this.activate(params.question);
        return;
      }
    }
    this.writeUrl();
  }

  questionForCity(id, city = this.mapManager.getCurrentCity()) {
    return (typeof QUESTIONS !== 'undefined' ? QUESTIONS : []).find((q) => (
      q.id === id && (!q.cities || q.cities.includes(city))
    )) || null;
  }

  questionsForCity(city = this.mapManager.getCurrentCity()) {
    return (typeof QUESTIONS !== 'undefined' ? QUESTIONS : []).filter((q) => (
      !q.cities || q.cities.includes(city)
    ));
  }

  setupTabs() {
    document.querySelectorAll('.panel-tab').forEach((btn) => {
      btn.addEventListener('click', () => this.setTab(btn.dataset.tab));
    });
  }

  setupRankingCollapse() {
    const panel = document.getElementById('ranking-panel');
    const btn = document.getElementById('ranking-collapse-btn');
    if (!panel || !btn) return;

    const apply = (collapsed) => {
      panel.classList.toggle('collapsed', collapsed);
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.setAttribute('title', collapsed ? 'Expandir' : 'Contraer');
    };

    let collapsed = false;
    try {
      collapsed = localStorage.getItem('mauri_sp_ranking_collapsed') === '1';
    } catch (e) { /* ignore */ }
    apply(collapsed);

    btn.addEventListener('click', () => {
      const next = !panel.classList.contains('collapsed');
      apply(next);
      try {
        localStorage.setItem('mauri_sp_ranking_collapsed', next ? '1' : '0');
      } catch (e) { /* ignore */ }
    });
  }

  setTab(tab, options = {}) {
    this.tab = tab === 'layers' ? 'layers' : 'questions';
    const questionsPanel = document.getElementById('questions-panel');
    const layerControls = document.getElementById('layer-controls');
    const title = document.getElementById('controls-title');
    const icon = document.getElementById('controls-header-icon');

    document.querySelectorAll('.panel-tab').forEach((btn) => {
      const active = btn.dataset.tab === this.tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });

    if (this.tab === 'layers') {
      if (questionsPanel) questionsPanel.hidden = true;
      if (layerControls) layerControls.hidden = false;
      if (title) title.textContent = 'Capas del Mapa';
      if (icon) icon.className = 'fas fa-layer-group';
      this.clearAnalysis();
      this.currentQuestionId = null;
      this.renderCards();
    } else {
      if (questionsPanel) questionsPanel.hidden = false;
      if (layerControls) layerControls.hidden = true;
      if (title) title.textContent = 'Preguntas';
      if (icon) icon.className = 'fas fa-question-circle';
    }

    if (!options.skipUrl) this.writeUrl();
  }

  renderCards() {
    const list = document.getElementById('questions-list');
    if (!list) return;
    const city = this.mapManager.getCurrentCity();
    list.innerHTML = '';
    this.questionsForCity(city).forEach((question) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'question-card';
      if (question.id === this.currentQuestionId) btn.classList.add('active');
      btn.dataset.question = question.id;
      btn.innerHTML = `
        <span class="question-card-title"><i class="${question.icon}"></i> ${question.title}</span>
        <span class="question-card-blurb">${question.blurb}</span>
      `;
      btn.addEventListener('click', () => {
        if (this.currentQuestionId === question.id) {
          this.clearAnalysis();
          this.currentQuestionId = null;
          this.renderCards();
          this.writeUrl();
          return;
        }
        this.activate(question.id);
      });
      list.appendChild(btn);
    });
  }

  onCitySwitch() {
    this.analysisGeneration += 1;
    this.clearAnalysis();
    this.renderCards();
    if (this.tab === 'questions' && this.currentQuestionId) {
      const next = this.questionForCity(this.currentQuestionId);
      if (next) {
        this.activate(next.id);
        return;
      }
      this.currentQuestionId = null;
    }
    this.writeUrl();
  }

  async activate(questionId) {
    const question = this.questionForCity(questionId);
    if (!question) return;

    this.uiManager.hideAllLayers();
    this.setTab('questions', { skipUrl: true });
    this.currentQuestionId = question.id;
    this.renderCards();
    this.clearAnalysisLayersOnly();
    this.showRankingLoading();

    const city = this.mapManager.getCurrentCity();
    const cityConfig = CITIES_CONFIG[city];
    const fields = ElectoralAnalysis.getFields(city);
    const circuitConfig = cityConfig.layers[CIRCUIT_LAYER_NAME];
    const mesasConfig = cityConfig.layers[MESAS_LAYER_NAME];
    if (!fields || !circuitConfig || !mesasConfig) {
      this.showRankingError('No hay datos electorales para esta ciudad.');
      return;
    }

    const generation = ++this.analysisGeneration;
    try {
      const [circuitosGeo, mesasGeo] = await Promise.all([
        this.layerManager.fetchGeoJSON(circuitConfig.file),
        this.layerManager.fetchGeoJSON(mesasConfig.file)
      ]);
      if (generation !== this.analysisGeneration) return;
      if (this.mapManager.getCurrentCity() !== city) return;

      const agg = ElectoralAnalysis.aggregateSchools(mesasGeo, circuitosGeo, fields);
      this.agg = agg;
      this.fields = fields;
      this.metric = question.metric;
      this.selectedId = null;

      if (question.metric === 'escuelas') {
        this.renderSchoolsQuestion(question, agg);
      } else {
        this.renderCircuitQuestion(question, circuitosGeo, agg);
      }
      this.writeUrl();
    } catch (error) {
      if (generation !== this.analysisGeneration) return;
      console.error('Error activating question:', error);
      this.showRankingError('No se pudo cargar el análisis.');
    }
  }

  renderCircuitQuestion(question, circuitosGeo, agg) {
    const palette = COLOR_PALETTES.choropleth;
    const rows = Object.values(agg.byCircuit);
    const values = rows
      .map((row) => ElectoralAnalysis.metricValue(row, question.metric))
      .filter((v) => v != null && Number.isFinite(v));
    this.breaks = ElectoralAnalysis.quantileBreaks(values, 5);

    this.circuitLayersById = {};
    this.circuitLayer = L.geoJSON(circuitosGeo, {
      style: (feature) => this.circuitStyle(feature),
      onEachFeature: (feature, layer) => {
        const id = ElectoralAnalysis.getPolyCircuitId(feature.properties, this.fields);
        if (id) this.circuitLayersById[id] = layer;
        layer.on('click', () => this.selectCircuit(id));
        layer.bindPopup(() => this.circuitPopupHtml(agg.byCircuit[id] || ElectoralAnalysis.emptyBucket(id)), {
          className: 'custom-popup',
          maxWidth: 320
        });
      }
    });
    this.circuitLayer.addTo(this.mapManager.getMap());

    this.layerManager.legend.updateAnalysis(
      ElectoralAnalysis.metricLabel(question.metric),
      ElectoralAnalysis.legendItems(this.breaks, palette, question.metric),
      'Colores por cuantiles. No son resultados de una elección.'
    );
    this.renderRanking(ElectoralAnalysis.rank(rows, question.metric), 'circuit', question);
  }

  renderSchoolsQuestion(question, agg) {
    const palette = COLOR_PALETTES.choropleth;
    const values = agg.schools
      .map((row) => ElectoralAnalysis.metricValue(row, 'escuelas'))
      .filter((v) => v != null && Number.isFinite(v));
    this.breaks = ElectoralAnalysis.quantileBreaks(values, 5);
    this.schoolMarkersByKey = {};
    this.schoolLayer = L.layerGroup();

    agg.schools.forEach((school) => {
      const latlng = SpatialUtils.extractLatLng(school.feature.geometry);
      if (!latlng) return;
      if (Math.abs(latlng[0]) > 90 || Math.abs(latlng[1]) > 180) return;
      const value = school.electores;
      const color = ElectoralAnalysis.colorFor(value, this.breaks, palette);
      const radius = 6 + Math.min(16, Math.sqrt(Math.max(value, 0)) / 12);
      const marker = L.circleMarker(latlng, {
        radius,
        color: '#1a202c',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.85,
        opacity: 0.95
      });
      const key = this.schoolKey(school);
      marker.on('click', () => this.selectSchool(key));
      marker.bindPopup(() => this.schoolPopupHtml(school), {
        className: 'custom-popup',
        maxWidth: 320
      });
      this.schoolMarkersByKey[key] = { marker, school };
      this.schoolLayer.addLayer(marker);
    });

    this.schoolLayer.addTo(this.mapManager.getMap());
    this.layerManager.legend.updateAnalysis(
      ElectoralAnalysis.metricLabel('escuelas'),
      ElectoralAnalysis.legendItems(this.breaks, palette, 'electores'),
      'Cada punto es un establecimiento con mesas. El tamaño sigue al padrón.'
    );
    this.renderRanking(ElectoralAnalysis.rank(agg.schools, 'escuelas'), 'school', question);
  }

  circuitStyle(feature, highlightedId) {
    const id = ElectoralAnalysis.getPolyCircuitId(feature.properties, this.fields);
    const row = this.agg && this.agg.byCircuit[id];
    const value = ElectoralAnalysis.metricValue(row, this.metric);
    const highlighted = !!highlightedId && highlightedId === id;
    return MapUtils.getChoroplethStyle(value, this.breaks, COLOR_PALETTES.choropleth, highlighted);
  }

  schoolKey(school) {
    return String(school.uid);
  }

  circuitPopupHtml(row) {
    const metricLabel = ElectoralAnalysis.metricLabel(this.metric);
    const metricValue = ElectoralAnalysis.formatMetric(
      ElectoralAnalysis.metricValue(row, this.metric),
      this.metric
    );
    return `
      <div class="popup-title"><i class="fas fa-vote-yea"></i> Circuito ${row.id || '—'}</div>
      <div class="popup-item"><span class="popup-label">${metricLabel}:</span> <span class="popup-value">${metricValue}</span></div>
      <div class="popup-item"><span class="popup-label">Electores:</span> <span class="popup-value">${ElectoralAnalysis.formatInt(row.electores)}</span></div>
      <div class="popup-item"><span class="popup-label">Mesas:</span> <span class="popup-value">${ElectoralAnalysis.formatInt(row.mesas)}</span></div>
      <div class="popup-item"><span class="popup-label">Escuelas:</span> <span class="popup-value">${ElectoralAnalysis.formatInt(row.escuelas)}</span></div>
      <div class="popup-item"><span class="popup-label">Electores / mesa:</span> <span class="popup-value">${ElectoralAnalysis.formatRatio(row.ratio)}</span></div>
    `;
  }

  schoolPopupHtml(school) {
    return `
      <div class="popup-title"><i class="fas fa-school"></i> ${school.name}</div>
      <div class="popup-item"><span class="popup-label">Circuito:</span> <span class="popup-value">${school.circuitId || '—'}</span></div>
      <div class="popup-item"><span class="popup-label">Electores:</span> <span class="popup-value">${ElectoralAnalysis.formatInt(school.electores)}</span></div>
      <div class="popup-item"><span class="popup-label">Mesas:</span> <span class="popup-value">${ElectoralAnalysis.formatInt(school.mesas)}</span></div>
      <div class="popup-item"><span class="popup-label">Electores / mesa:</span> <span class="popup-value">${ElectoralAnalysis.formatRatio(school.ratio)}</span></div>
    `;
  }

  showRankingLoading() {
    const panel = document.getElementById('ranking-panel');
    const list = document.getElementById('ranking-list');
    const title = document.getElementById('ranking-title');
    if (panel) panel.hidden = false;
    if (title) title.textContent = 'Cargando…';
    if (list) list.innerHTML = '<div class="ranking-empty">Calculando agregados…</div>';
  }

  showRankingError(message) {
    const panel = document.getElementById('ranking-panel');
    const list = document.getElementById('ranking-list');
    const title = document.getElementById('ranking-title');
    if (panel) panel.hidden = false;
    if (title) title.textContent = 'Análisis';
    if (list) list.innerHTML = `<div class="ranking-empty">${message}</div>`;
  }

  renderRanking(rows, kind, question) {
    const panel = document.getElementById('ranking-panel');
    const list = document.getElementById('ranking-list');
    const title = document.getElementById('ranking-title');
    if (!panel || !list) return;
    panel.hidden = false;
    if (title) title.textContent = kind === 'school' ? 'Escuelas' : 'Circuitos';

    if (!rows.length) {
      list.innerHTML = '<div class="ranking-empty">Sin datos para rankear.</div>';
      return;
    }

    const metric = kind === 'school' ? 'escuelas' : question.metric;
    list.innerHTML = '';
    rows.forEach((row, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'ranking-item';
      const id = kind === 'school' ? this.schoolKey(row) : row.id;
      item.dataset.kind = kind;
      item.dataset.id = id;
      const label = kind === 'school' ? row.name : `Circuito ${row.id}`;
      const sub = kind === 'school'
        ? `Circuito ${row.circuitId || '—'} · ${ElectoralAnalysis.formatInt(row.mesas)} mesas`
        : `${ElectoralAnalysis.formatInt(row.escuelas)} escuelas · ${ElectoralAnalysis.formatInt(row.mesas)} mesas`;
      item.innerHTML = `
        <span class="ranking-rank">${index + 1}</span>
        <span class="ranking-body">
          <span class="ranking-label">${label}</span>
          <span class="ranking-sub">${sub}</span>
        </span>
        <span class="ranking-value">${ElectoralAnalysis.formatMetric(ElectoralAnalysis.metricValue(row, metric), metric)}</span>
      `;
      item.addEventListener('click', () => {
        if (kind === 'school') this.selectSchool(id);
        else this.selectCircuit(row.id);
      });
      list.appendChild(item);
    });
  }

  markRankingActive(id) {
    document.querySelectorAll('.ranking-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === String(id));
    });
  }

  selectCircuit(id) {
    if (!id || !this.circuitLayer) return;
    this.selectedId = id;
    this.circuitLayer.eachLayer((layer) => {
      const feature = layer.feature;
      if (!feature) return;
      layer.setStyle(this.circuitStyle(feature, id));
    });
    const layer = this.circuitLayersById[id];
    const map = this.mapManager.getMap();
    const bounds = L.latLngBounds([]);
    if (layer && layer.getBounds && layer.getBounds().isValid()) {
      bounds.extend(layer.getBounds());
    }
    const row = this.agg && this.agg.byCircuit[id];
    if (row && row.schools) {
      row.schools.forEach((school) => {
        const latlng = SpatialUtils.extractLatLng(school.feature && school.feature.geometry);
        if (latlng) bounds.extend(latlng);
      });
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    if (layer && layer.openPopup) layer.openPopup();
    this.markRankingActive(id);
  }

  selectSchool(key) {
    const entry = this.schoolMarkersByKey[key];
    if (!entry) return;
    this.selectedId = key;
    Object.values(this.schoolMarkersByKey).forEach(({ marker }) => {
      marker.setStyle({ weight: 1, color: '#1a202c' });
    });
    entry.marker.setStyle({ weight: 3, color: '#1a202c' });
    const latlng = entry.marker.getLatLng();
    this.mapManager.getMap().setView(latlng, Math.max(this.mapManager.getMap().getZoom(), 15));
    entry.marker.openPopup();
    this.markRankingActive(key);
  }

  clearAnalysisLayersOnly() {
    const map = this.mapManager.getMap();
    if (this.circuitLayer && map.hasLayer(this.circuitLayer)) map.removeLayer(this.circuitLayer);
    if (this.schoolLayer && map.hasLayer(this.schoolLayer)) map.removeLayer(this.schoolLayer);
    this.circuitLayer = null;
    this.schoolLayer = null;
    this.circuitLayersById = {};
    this.schoolMarkersByKey = {};
    this.agg = null;
    this.breaks = [];
    this.selectedId = null;
    this.layerManager.legend.clearAnalysis();
  }

  clearAnalysis() {
    this.analysisGeneration += 1;
    this.clearAnalysisLayersOnly();
    const panel = document.getElementById('ranking-panel');
    const list = document.getElementById('ranking-list');
    if (panel) panel.hidden = true;
    if (list) list.innerHTML = '';
  }
}
