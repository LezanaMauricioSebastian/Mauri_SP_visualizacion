// Agregados electorales: mesas/electores → circuito (sin UI)
const ElectoralAnalysis = {
  normalizeCircuitId(value) {
    if (value == null || value === '') return null;
    let s = String(value).trim().toUpperCase();
    if (!s || s === 'NULL' || s === 'UNDEFINED' || s === 'NAN') return null;
    if (/^-?\d+\.0+$/.test(s)) s = String(parseInt(s, 10));
    // GR/VA: "0005A" / "0077" → "5A" / "77". SP: 88.0 → "88".
    const padded = s.match(/^0*(\d+[A-Z]*)$/);
    if (padded) return padded[1];
    return s;
  },

  num(value) {
    if (value == null || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  },

  getFields(cityKey) {
    const city = CITIES_CONFIG[cityKey];
    return city && city.electoral ? city.electoral : null;
  },

  getPointCircuitId(properties, fields) {
    if (!properties || !fields) return null;
    return ElectoralAnalysis.normalizeCircuitId(properties[fields.circuitoPoint]);
  },

  getPolyCircuitId(properties, fields) {
    if (!properties || !fields) return null;
    return ElectoralAnalysis.normalizeCircuitId(properties[fields.circuitoPoly]);
  },

  buildCircuitRingIndex(circuitosGeo, fields) {
    if (!circuitosGeo || !circuitosGeo.features) return [];
    return circuitosGeo.features.map((feature) => {
      const key = ElectoralAnalysis.getPolyCircuitId(feature.properties, fields);
      const rings = [];
      const geom = feature.geometry;
      if (!geom) return { key, rings, feature };

      let polygons = [];
      if (geom.type === 'Polygon') polygons = [geom.coordinates];
      else if (geom.type === 'MultiPolygon') polygons = geom.coordinates;

      for (let p = 0; p < polygons.length; p++) {
        const poly = polygons[p];
        const outer = poly && poly[0];
        if (!outer || outer.length < 3) continue;
        const ring = SpatialUtils.ringToLatLng(outer);
        const holes = [];
        for (let h = 1; h < poly.length; h++) {
          if (poly[h] && poly[h].length >= 3) {
            holes.push(SpatialUtils.ringToLatLng(poly[h]).coords);
          }
        }
        ring.holes = holes;
        rings.push(ring);
      }
      return { key, rings, feature };
    });
  },

  locateCircuitByPoint(latlng, index) {
    if (!latlng || !index) return null;
    const lat = latlng[0];
    const lng = latlng[1];
    for (let n = index.length - 1; n >= 0; n--) {
      const item = index[n];
      if (!item.key) continue;
      for (let r = 0; r < item.rings.length; r++) {
        const ring = item.rings[r];
        if (lat < ring.minLat || lat > ring.maxLat || lng < ring.minLng || lng > ring.maxLng) {
          continue;
        }
        if (!SpatialUtils.isPointInPolygon(latlng, ring.coords)) continue;
        let inHole = false;
        const holes = ring.holes || [];
        for (let h = 0; h < holes.length; h++) {
          if (SpatialUtils.isPointInPolygon(latlng, holes[h])) {
            inHole = true;
            break;
          }
        }
        if (!inHole) return item.key;
      }
    }
    return null;
  },

  emptyBucket(id) {
    return { id, electores: 0, mesas: 0, escuelas: 0, ratio: null, schools: [] };
  },

  aggregateSchools(mesasGeo, circuitosGeo, fields) {
    const byCircuit = {};
    const schools = [];
    const index = ElectoralAnalysis.buildCircuitRingIndex(circuitosGeo, fields);

    const ensure = (id) => {
      if (!id) return null;
      if (!byCircuit[id]) byCircuit[id] = ElectoralAnalysis.emptyBucket(id);
      return byCircuit[id];
    };

    if (circuitosGeo && circuitosGeo.features) {
      circuitosGeo.features.forEach((feature) => {
        ensure(ElectoralAnalysis.getPolyCircuitId(feature.properties, fields));
      });
    }

    const features = (mesasGeo && mesasGeo.features) || [];
    features.forEach((feature, index) => {
      const props = feature.properties || {};
      let id = ElectoralAnalysis.getPointCircuitId(props, fields);
      if (!id) {
        const latlng = SpatialUtils.extractLatLng(feature.geometry);
        id = ElectoralAnalysis.locateCircuitByPoint(latlng, index);
      }
      const mesas = ElectoralAnalysis.num(props[fields.mesas]);
      const electores = ElectoralAnalysis.num(props[fields.electores]);
      const name = props[fields.escuela] || 'Sin nombre';
      const ratio = mesas > 0 ? electores / mesas : null;
      const school = { uid: index, name, circuitId: id, mesas, electores, ratio, feature };
      schools.push(school);

      const bucket = ensure(id);
      if (!bucket) return;
      bucket.electores += electores;
      bucket.mesas += mesas;
      bucket.escuelas += 1;
      bucket.schools.push(school);
    });

    Object.keys(byCircuit).forEach((id) => {
      const bucket = byCircuit[id];
      bucket.ratio = bucket.mesas > 0 ? bucket.electores / bucket.mesas : null;
    });

    return { byCircuit, schools };
  },

  metricValue(row, metric) {
    if (!row) return null;
    if (metric === 'electores') return row.electores;
    if (metric === 'mesas') return row.mesas;
    if (metric === 'ratio') return row.ratio;
    if (metric === 'escuelas') return row.electores;
    return null;
  },

  quantileBreaks(values, nClasses = 5) {
    const sorted = values
      .filter((v) => typeof v === 'number' && Number.isFinite(v))
      .slice()
      .sort((a, b) => a - b);
    if (!sorted.length) return [];
    const breaks = [];
    for (let i = 1; i <= nClasses; i++) {
      const pos = (i / nClasses) * (sorted.length - 1);
      const lo = Math.floor(pos);
      const hi = Math.ceil(pos);
      const val = lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
      breaks.push(val);
    }
    for (let i = 1; i < breaks.length; i++) {
      if (breaks[i] < breaks[i - 1]) breaks[i] = breaks[i - 1];
    }
    return breaks;
  },

  classIndex(value, breaks) {
    if (value == null || !Number.isFinite(value) || !breaks.length) return -1;
    for (let i = 0; i < breaks.length; i++) {
      if (value <= breaks[i]) return i;
    }
    return breaks.length - 1;
  },

  colorFor(value, breaks, palette) {
    const idx = ElectoralAnalysis.classIndex(value, breaks);
    if (idx < 0) return '#e0e0e0';
    return palette[Math.min(idx, palette.length - 1)];
  },

  rank(rows, metric) {
    return rows
      .filter((row) => {
        const value = ElectoralAnalysis.metricValue(row, metric);
        return value != null && Number.isFinite(value);
      })
      .slice()
      .sort((a, b) => ElectoralAnalysis.metricValue(b, metric) - ElectoralAnalysis.metricValue(a, metric));
  },

  formatInt(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    return Math.round(value).toLocaleString('es-AR');
  },

  formatRatio(value) {
    if (value == null || !Number.isFinite(value)) return '—';
    return value.toLocaleString('es-AR', { maximumFractionDigits: 1 });
  },

  formatMetric(value, metric) {
    if (metric === 'ratio') return ElectoralAnalysis.formatRatio(value);
    return ElectoralAnalysis.formatInt(value);
  },

  metricLabel(metric) {
    if (metric === 'mesas') return 'Mesas';
    if (metric === 'ratio') return 'Electores / mesa';
    if (metric === 'escuelas') return 'Electores';
    return 'Electores';
  },

  legendItems(breaks, palette, metric) {
    if (!breaks.length) return [];
    const items = [];
    let prev = null;
    for (let i = 0; i < breaks.length; i++) {
      const hi = breaks[i];
      const color = palette[Math.min(i, palette.length - 1)];
      let label;
      if (prev == null) {
        label = `≤ ${ElectoralAnalysis.formatMetric(hi, metric)}`;
      } else if (hi === prev) {
        continue;
      } else {
        label = `${ElectoralAnalysis.formatMetric(prev, metric)} – ${ElectoralAnalysis.formatMetric(hi, metric)}`;
      }
      items.push({ color, label });
      prev = hi;
    }
    return items;
  }
};
