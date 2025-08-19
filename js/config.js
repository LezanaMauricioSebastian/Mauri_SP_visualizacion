// Configuración de ciudades
const CITIES_CONFIG = {
  sp: {
    name: 'Presidencia Roque Sáenz Peña',
    center: [-26.79005, -60.4358],
    zoom: 13,
    dataPath: 'datos/SP/',
    layers: {
      'Calles': {
        file: 'calles_2024_sp.geojson',
        properties: ['name', 'superclas'],
        icon: 'fas fa-road',
        group: 'Infraestructura'
      },
      'Barrios': {
        file: 'barrios_sp.geojson',
        properties: ['nombre'],
        icon: 'fas fa-home',
        group: 'Divisiones'
      },
      'Lugares públicos': {
        file: 'lugares_publicos_sp.geojson',
        properties: ['leisure', 'name'],
        icon: 'fas fa-tree',
        group: 'Servicios'
      },
      'Manzanas': {
        file: 'mzas_poly_22_sp.geojson',
        properties: ['AREA'],
        icon: 'fas fa-th',
        group: 'Divisiones'
      },
      'Circuito electoral': {
        file: 'circuilto_elect_sp.geojson',
        properties: ['CIRC_ELECT'],
        icon: 'fas fa-vote-yea',
        group: 'Electoral'
      },
      'Mesas por Escuela': {
        file: 'mesas_electores_x_escuela_sp.geojson',
        properties: ['NOMBRE_ESC', 'CUENTADENU', 'SUMADECUEN', 'CIRCUITO'],
        icon: 'fas fa-school',
        group: 'Electoral',
        type: 'clustered',
        valueProperty: 'CUENTADENU'
      },
      'Electores por Escuela': {
        file: 'mesas_electores_x_escuela_sp.geojson',
        properties: ['NOMBRE_ESC', 'CUENTADENU', 'SUMADECUEN', 'CIRCUITO'],
        icon: 'fas fa-users',
        group: 'Electoral',
        type: 'clustered',
        valueProperty: 'SUMADECUEN'
      },
      'Radios Censales': {
        file: 'radios_censo_sp.geojson',
        properties: ['LINK', 'AREA'],
        icon: 'fas fa-chart-area',
        group: 'Censo'
      },
      'Población por Radio': {
        file: 'cant_viv_radio_sp.geojson',
        properties: ['AREA', 'RADIO2020', 'Datos x ra', 'Datos x _1', 'Datos x _2', 'Datos x _3'],
        icon: 'fas fa-users',
        group: 'Censo'
      },
      'Edificaciones': {
        file: 'Edificaciones_2024_Siluetas.geojson',
        properties: ['area', 'area_in_meters', 'confindence', 'full_plus_code'],
        icon: 'fas fa-building',
        group: 'Infraestructura'
      }
    }
  },
  gr: {
    name: 'Gran Resistencia',
    center: [-27.4606, -58.9837],
    zoom: 12,
    dataPath: 'datos/gran_Resis/',
    layers: {
      'Calles': {
        file: 'calles_2024_amgr.geojson',
        properties: ['name', 'superclas'],
        icon: 'fas fa-road',
        group: 'Infraestructura'
      },
      'Barrios': {
        file: 'barrios_amgr.geojson',
        properties: ['Barrio', 'Municipio'],
        icon: 'fas fa-home',
        group: 'Divisiones'
      },
      'Asentamientos': {
        file: 'asentamientos_amgr.geojson',
        properties: ['Barrios', 'Municipio'],
        icon: 'fas fa-campground',
        group: 'Divisiones'
      },
      'Lugares públicos': {
        file: 'lugares_publicos_amgr.geojson',
        properties: ['leisure', 'name'],
        icon: 'fas fa-tree',
        group: 'Servicios'
      },
      'Manzanas': {
        file: 'manzanero_amgr.geojson',
        properties: ['AREA'],
        icon: 'fas fa-th',
        group: 'Divisiones'
      },
      'Circuitos Electorales': {
        file: 'circuitos_elect_amgr.geojson',
        properties: ['circuito', 'cabecera', 'departamen'],
        icon: 'fas fa-vote-yea',
        group: 'Electoral'
      },
              'Mesas por Escuela': {
          file: 'mesas_electores_x_escuelas_amgr.geojson',
          properties: ['nombre', 'cn_mesas', 'electores', 'circuito', 'localidad'],
          icon: 'fas fa-school',
          group: 'Electoral',
          type: 'clustered',
          valueProperty: 'cn_mesas'
        },
        'Electores por Escuela': {
          file: 'mesas_electores_x_escuelas_amgr.geojson',
          properties: ['nombre', 'cn_mesas', 'electores', 'circuito', 'localidad'],
          icon: 'fas fa-users',
          group: 'Electoral',
          type: 'clustered',
          valueProperty: 'electores'
        },
        'Población por Radio': {
          file: 'poblac_viv_radio_22_amgr.geojson',
          properties: ['AREA', 'LINK', '2022Total', '2022Mujere', '2022Varone', '2022Total_'],
          icon: 'fas fa-users',
          group: 'Censo'
        }
    }
  }
};

// Paletas de colores
const COLOR_PALETTES = {
  radios: [
    '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', 
    '#a65628', '#f781bf', '#999999', '#66c2a5', '#fc8d62', '#8da0cb', 
    '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3', '#1f78b4', 
    '#33a02c', '#e31a1c', '#ff7f00', '#6a3d9a', '#b15928', '#a6cee3'
  ],
  barrios: [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#aec7e8', '#ffbb78',
    '#98df8a', '#ff9896', '#c5b0d5', '#c49c94', '#f7b6d3', '#c7c7c7',
    '#dbdb8d', '#9edae5', '#393b79', '#5254a3', '#6b6ecf', '#9c9ede'
  ],
  circuitos: [
    '#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
    '#a6761d', '#666666', '#a6cee3', '#fb9a99', '#b2df8a', '#33a02c',
    '#cab2d6', '#6a3d9a', '#ffff99', '#b15928', '#fdbf6f', '#ff7f00'
  ],
  asentamientos: [
    '#8e44ad', '#e74c3c', '#f39c12', '#27ae60', '#3498db', '#e67e22',
    '#9b59b6', '#1abc9c', '#34495e', '#f1c40f', '#e8b339', '#c0392b'
  ],
  calles: {
    'pavimentado': '#2196F3',
    'no pavimento': '#FF5722'
  },
  genero: {
    'mas_hombres': '#64B5F6',    // Azul claro
    'mas_mujeres': '#F48FB1',    // Rosa claro
    'equilibrado': '#A5D6A7',    // Verde claro
    'sin_datos': '#E0E0E0'       // Gris claro
  }
};

// Traducciones para popups
const TRANSLATIONS = {
  'Calles': { 'superclas': 'Tipo', 'name': 'Nombre' },
  'Lugares públicos': { 'leisure': 'Tipo', 'name': 'Nombre' },
  'Barrios': { 'Barrio': 'Barrio', 'Municipio': 'Municipio', 'nombre': 'Nombre' },
  'Asentamientos': { 'Barrios': 'Asentamiento', 'Municipio': 'Municipio' },
  'Población por Radio': {
    'Datos x ra': 'Población total',
    'Datos x _1': 'Mujeres',
    'Datos x _2': 'Varones',
    'Datos x _3': 'Viviendas',
    'AREA': 'Área',
    'RADIO2020': 'Radio',
    'LINK': 'Radio',
    '2022Total': 'Población total',
    '2022Mujere': 'Mujeres',
    '2022Varone': 'Varones',
    '2022Total_': 'Viviendas'
  },
  'Radios Censales': { 'LINK': 'Radio' },
  'Mesas por Escuela': {
    'NOMBRE_ESC': 'Escuela',
    'CUENTADENU': 'Mesas',
    'SUMADECUEN': 'Electores',
    'CIRCUITO': 'Circuito',
    'nombre': 'Escuela',
    'cn_mesas': 'Mesas',
    'electores': 'Electores',
    'circuito': 'Circuito',
    'localidad': 'Localidad'
  },
  'Electores por Escuela': {
    'NOMBRE_ESC': 'Escuela',
    'CUENTADENU': 'Mesas',
    'SUMADECUEN': 'Electores',
    'CIRCUITO': 'Circuito',
    'nombre': 'Escuela',
    'cn_mesas': 'Mesas',
    'electores': 'Electores',
    'circuito': 'Circuito',
    'localidad': 'Localidad'
  },
  'Circuito electoral': { 'CIRC_ELECT': 'Circuito Electoral' },
  'Circuitos Electorales': { 
    'circuito': 'Circuito', 
    'cabecera': 'Cabecera', 
    'departamen': 'Departamento',
    'CIRC_ELECT': 'Circuito Electoral' 
  }
}; 