// Utilidades espaciales y conteo de puntos por barrio
const SpatialUtils = {
  extractLatLng(geometry) {
    const points = SpatialUtils.extractAllLatLngs(geometry);
    return points.length ? points[0] : null;
  },

  extractAllLatLngs(geometry) {
    if (!geometry || !geometry.coordinates) return [];

    const toLatLng = (coords) => {
      if (!coords || coords.length < 2) return null;
      const lat = coords[1];
      const lng = coords[0];
      if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) {
        return null;
      }
      return [lat, lng];
    };

    if (geometry.type === 'Point') {
      const pt = toLatLng(geometry.coordinates);
      return pt ? [pt] : [];
    }

    if (geometry.type === 'MultiPoint') {
      const points = [];
      const coords = geometry.coordinates || [];
      for (let i = 0; i < coords.length; i++) {
        const pt = toLatLng(coords[i]);
        if (pt) points.push(pt);
      }
      return points;
    }

    return [];
  },

  ringToLatLng(ring) {
    const coords = new Array(ring.length);
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (let i = 0; i < ring.length; i++) {
      const lat = ring[i][1];
      const lng = ring[i][0];
      coords[i] = [lat, lng];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }

    return { coords, minLat, maxLat, minLng, maxLng };
  },

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
  },

  buildNeighborhoodIndex(geo) {
    if (!geo) return null;

    return geo.features.map((neighborhood) => {
      const key = MapUtils.getNeighborhoodKey(neighborhood.properties);
      const rings = [];
      const geom = neighborhood.geometry;
      if (!geom) return { key, rings };

      let polygons = [];
      if (geom.type === 'Polygon') {
        polygons = [geom.coordinates];
      } else if (geom.type === 'MultiPolygon') {
        polygons = geom.coordinates;
      }

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

      return { key, rings };
    });
  },

  countPointsInNeighborhoods(features, index) {
    if (!index || !features) return null;

    const counts = {};
    for (let i = 0; i < index.length; i++) {
      counts[index[i].key] = 0;
    }

    for (let f = 0; f < features.length; f++) {
      const points = SpatialUtils.extractAllLatLngs(features[f].geometry);
      for (let p = 0; p < points.length; p++) {
        const pt = points[p];
        const lat = pt[0];
        const lng = pt[1];

        // Recorre de atrás hacia adelante para preservar "último barrio gana" si hay solape.
        for (let n = index.length - 1; n >= 0; n--) {
          const neighborhood = index[n];
          let inside = false;
          for (let r = 0; r < neighborhood.rings.length; r++) {
            const ring = neighborhood.rings[r];
            if (lat < ring.minLat || lat > ring.maxLat || lng < ring.minLng || lng > ring.maxLng) {
              continue;
            }
            if (!SpatialUtils.isPointInPolygon(pt, ring.coords)) continue;

            let inHole = false;
            const holes = ring.holes || [];
            for (let h = 0; h < holes.length; h++) {
              if (SpatialUtils.isPointInPolygon(pt, holes[h])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) {
              inside = true;
              break;
            }
          }
          if (inside) {
            counts[neighborhood.key]++;
            break;
          }
        }
      }
    }

    return counts;
  }
};

class NeighborhoodCounts {
  constructor({ getGeoJSON, hasDataset }) {
    this.getGeoJSON = getGeoJSON;
    this.hasDataset = hasDataset;
    this.reset();
  }

  reset() {
    this.calculated = false;
    this.cache = {
      schools: null,
      police: null,
      blocks: null
    };
    this.index = null;
  }

  getIndex() {
    if (this.index) return this.index;
    this.index = SpatialUtils.buildNeighborhoodIndex(this.getGeoJSON('Barrios'));
    return this.index;
  }

  countBlocksPerNeighborhood() {
    if (this.cache.blocks) return this.cache.blocks;
    const blocks = this.getGeoJSON('Manzanas_Puntos');
    const neighborhoods = this.getGeoJSON('Barrios');
    if (!blocks || !neighborhoods) return null;
    this.cache.blocks = SpatialUtils.countPointsInNeighborhoods(blocks.features, this.getIndex());
    return this.cache.blocks;
  }

  countPoliceStationsPerNeighborhood() {
    if (this.cache.police) return this.cache.police;
    const police = this.getGeoJSON('Comisarias');
    const neighborhoods = this.getGeoJSON('Barrios');
    if (!police || !neighborhoods) return null;
    this.cache.police = SpatialUtils.countPointsInNeighborhoods(police.features, this.getIndex());
    return this.cache.police;
  }

  countSchoolsPerNeighborhood() {
    if (this.cache.schools) return this.cache.schools;
    const schools = this.getGeoJSON('Escuelas');
    const neighborhoods = this.getGeoJSON('Barrios');
    if (!schools || !neighborhoods) return null;
    this.cache.schools = SpatialUtils.countPointsInNeighborhoods(schools.features, this.getIndex());
    return this.cache.schools;
  }

  apply() {
    const barrios = this.getGeoJSON('Barrios');
    if (!barrios) return;

    const hasSchools = this.hasDataset('Escuelas');
    const hasPolice = this.hasDataset('Comisarias');
    const hasBlocks = this.hasDataset('Manzanas_Puntos');
    if (!hasSchools && !hasPolice && !hasBlocks) return;

    const schoolCounts = hasSchools ? this.countSchoolsPerNeighborhood() : null;
    const policeCounts = hasPolice ? this.countPoliceStationsPerNeighborhood() : null;
    const blockCounts = hasBlocks ? this.countBlocksPerNeighborhood() : null;

    for (let i = 0; i < barrios.features.length; i++) {
      const feature = barrios.features[i];
      if (!feature.properties) feature.properties = {};
      const key = MapUtils.getNeighborhoodKey(feature.properties);
      if (schoolCounts) feature.properties.schoolCount = schoolCounts[key] || 0;
      if (policeCounts) feature.properties.policeCount = policeCounts[key] || 0;
      if (blockCounts) feature.properties.blockCount = blockCounts[key] || 0;
    }
  }
}
