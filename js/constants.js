// ============================================================
// Domain constants: workflow, states, close reasons, defaults
// ============================================================

export const WORKFLOW_STEPS = [
  { id: 'Guardado',               short: 'Guardado',     icon: '🔖' },
  { id: 'Aplicado',               short: 'Aplicado',     icon: '📤' },
  { id: 'Contacto',               short: 'Contacto',     icon: '💬' },
  { id: 'Entrevista RRHH',        short: 'RRHH',         icon: '👤' },
  { id: 'Challenge técnico',      short: 'Challenge',    icon: '🧪' },
  { id: 'Live coding',            short: 'Live coding',  icon: '⌨️' },
  { id: 'Entrevista Técnica',     short: 'Técnica',      icon: '💻' },
  { id: 'Entrevista con cliente', short: 'Entrev. cli.', icon: '🤝' },
  { id: 'Charla con cliente',     short: 'Charla cli.',  icon: '☕' },
  { id: 'Entrevista Final',       short: 'Final',        icon: '🎤' },
  { id: 'Referencias',            short: 'Referencias',  icon: '📞' },
  { id: 'Negociación',            short: 'Negociación',  icon: '💼' },
  { id: 'Oferta',                 short: 'Oferta',       icon: '🎉' },
];

export const CLOSED_STATES = ['Rechazado', 'Ghosted', 'Descartado'];
export const ALL_STATES = [...WORKFLOW_STEPS.map(s => s.id), ...CLOSED_STATES];

export const STATE_ICONS = {
  'Guardado':                '🔖',
  'Aplicado':                '📤',
  'Contacto':                '💬',
  'Entrevista RRHH':         '👤',
  'Challenge técnico':       '🧪',
  'Live coding':             '⌨️',
  'Entrevista Técnica':      '💻',
  'Entrevista con cliente':  '🤝',
  'Charla con cliente':      '☕',
  'Entrevista Final':        '🎤',
  'Referencias':             '📞',
  'Negociación':             '💼',
  'Oferta':                  '🎉',
  'Rechazado':               '✕',
  'Ghosted':                 '👻',
  'Descartado':              '🚫',
};

export function getStateIcon(estado) {
  return STATE_ICONS[estado] || '•';
}

export const REF_WORKFLOW_STEPS = [
  { id: 'Pendiente',       short: 'Pendiente' },
  { id: 'Contactado',      short: 'Contactado' },
  { id: 'Me va a referir', short: 'Va a referir' },
  { id: 'Referido hecho',  short: 'Referido' },
  { id: 'En proceso',      short: 'En proceso' },
  { id: 'Contratado',      short: 'Contratado' },
];

export const REF_CLOSED_STATES = ['No aplica'];
export const REF_ALL_STATES = [...REF_WORKFLOW_STEPS.map(s => s.id), ...REF_CLOSED_STATES];

export const REF_STATE_ICONS = {
  'Pendiente':       '⏳',
  'Contactado':      '💬',
  'Me va a referir': '🤝',
  'Referido hecho':  '✅',
  'En proceso':      '⏱️',
  'Contratado':      '🎉',
  'No aplica':       '🚫',
};

export function getRefStateIcon(estado) {
  return REF_STATE_ICONS[estado] || '•';
}

export const CLOSE_REASONS = {
  'Oferta':     ['Acepté la oferta', 'Recibí una mejor oferta', 'Fue mi primera opción'],
  'Rechazado':  ['No avanzó mi perfil', 'Faltó experiencia técnica', 'Eligieron a otro candidato', 'No cumplía requisitos', 'Pretensión salarial'],
  'Ghosted':    ['Dejaron de responder', 'Nunca dieron feedback', 'Se enfrió el proceso'],
  'Descartado': ['Me arrepentí', 'No me convenció la empresa', 'Pausé la búsqueda', 'La ubicación no servía'],
};

export const LOGO_OPTIONS = [
  {
    id: 'diana',
    label: 'Diana',
    description: 'Flecha apuntando al centro',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <path d="M12 3 L19 10"/>
      <path d="M15 4 L20 9 L19 10 L14 5 Z" fill="currentColor" stroke="none"/>
    </svg>`,
  },
  {
    id: 'maletin',
    label: 'Maletín',
    description: 'Ícono clásico de trabajo',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2"/>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M3 13h18"/>
      <path d="M12 13v2"/>
    </svg>`,
  },
];

export const DEFAULT_LOGO = 'diana';
export const DEFAULT_LANG = 'es';

// ============================================================
// Backgrounds
// ============================================================

export const BACKGROUND_OPTIONS = [
  { id: 'aurora',  label: 'Aurora',     description: 'Manchas de color animadas y borrosas' },
  { id: 'mesh',    label: 'Mesh',       description: 'Gradiente estático suave, sin animación' },
  { id: 'grid',    label: 'Grid',       description: 'Cuadrícula fina con foco radial' },
  { id: 'dots',    label: 'Puntos',     description: 'Patrón de puntos minimalista' },
  { id: 'waves',   label: 'Olas',       description: 'Dos manchas de color que se mueven lentamente' },
  { id: 'conic',   label: 'Conic',      description: 'Gradiente cónico girando lentamente' },
  { id: 'noise',   label: 'Grano',      description: 'Textura sutil de ruido sobre gradiente' },
  { id: 'stripes', label: 'Rayas',      description: 'Líneas diagonales finas' },
  { id: 'cosmos',  label: 'Cosmos',     description: 'Cielo nocturno con estrellas. Ideal para modo oscuro' },
  { id: 'blobs',   label: 'Blobs',      description: 'Dos manchas grandes que flotan lentamente' },
  { id: 'none',    label: 'Sin fondo',  description: 'Fondo plano por defecto' },
];

export const DEFAULT_BACKGROUND = 'aurora';

/**
 * Aplica el fondo al <body>. Se llama en boot y cada vez que
 * cambia la config.
 */
export function applyBackground(bgId) {
  const allClasses = BACKGROUND_OPTIONS.map(o => `bg-${o.id}`);
  document.body.classList.remove(...allClasses);
  if (bgId && bgId !== 'none') {
    document.body.classList.add(`bg-${bgId}`);
  }
}

export const ROLE_TAGS_LIST = [
  { id: 'programador', label: 'Programador', icon: '💻' },
  { id: 'frontend',    label: 'Frontend',    icon: '🎨' },
  { id: 'backend',     label: 'Backend',     icon: '⚙️' },
  { id: 'fullstack',   label: 'Full Stack',  icon: '🧩' },
  { id: 'mobile',      label: 'Mobile',      icon: '📱' },
  { id: 'qa',          label: 'QA',          icon: '🧪' },
  { id: 'devops',      label: 'DevOps',      icon: '🚀' },
  { id: 'data',        label: 'Data / IA',   icon: '📊' },
  { id: 'security',    label: 'Seguridad',   icon: '🔒' },
  { id: 'liderazgo',   label: 'Liderazgo',   icon: '👑' },
  { id: 'gamedev',     label: 'Game Dev',    icon: '🎮' },
];

export const DEFAULT_ROLES = [
  'Software Engineer', 'Software Developer',
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
  'Web Developer', 'Mobile Developer', 'iOS Developer', 'Android Developer',
  'Java Developer', 'JavaScript Developer', 'TypeScript Developer',
  'Python Developer', 'Node.js Developer', 'React Developer',
  'Angular Developer', 'Vue.js Developer', '.NET Developer',
  'PHP Developer', 'Go Developer', 'Ruby Developer', 'C++ Developer',
  'Embedded Software Engineer', 'Game Developer',
  'QA Automation Engineer', 'DevOps Engineer', 'SRE',
  'Data Engineer', 'Machine Learning Engineer', 'AI Engineer',
  'Security Engineer', 'Cloud Engineer', 'Platform Engineer',
  'Tech Lead',
];

export const ROLE_TAGS = {
  'Software Engineer':          ['programador'],
  'Software Developer':         ['programador'],
  'Frontend Developer':         ['programador', 'frontend'],
  'Backend Developer':          ['programador', 'backend'],
  'Full Stack Developer':       ['programador', 'fullstack'],
  'Web Developer':              ['programador', 'frontend'],
  'Mobile Developer':           ['programador', 'mobile'],
  'iOS Developer':              ['programador', 'mobile'],
  'Android Developer':          ['programador', 'mobile'],
  'Java Developer':             ['programador', 'backend'],
  'JavaScript Developer':       ['programador', 'frontend'],
  'TypeScript Developer':       ['programador'],
  'Python Developer':           ['programador', 'backend'],
  'Node.js Developer':          ['programador', 'backend'],
  'React Developer':            ['programador', 'frontend'],
  'Angular Developer':          ['programador', 'frontend'],
  'Vue.js Developer':           ['programador', 'frontend'],
  '.NET Developer':             ['programador', 'backend'],
  'PHP Developer':              ['programador', 'backend'],
  'Go Developer':               ['programador', 'backend'],
  'Ruby Developer':             ['programador', 'backend'],
  'C++ Developer':              ['programador', 'backend'],
  'Embedded Software Engineer': ['programador'],
  'Game Developer':             ['programador', 'gamedev'],
  'QA Automation Engineer':     ['qa'],
  'DevOps Engineer':            ['devops'],
  'SRE':                        ['devops'],
  'Data Engineer':              ['data'],
  'Machine Learning Engineer':  ['data'],
  'AI Engineer':                ['data'],
  'Security Engineer':          ['security'],
  'Cloud Engineer':             ['devops'],
  'Platform Engineer':          ['devops'],
  'Tech Lead':                  ['liderazgo'],
};

export const ROLE_ICONS = {
  'Frontend': '🎨', 'Backend': '⚙️', 'Full Stack': '🧩', 'Mobile': '📱',
  'QA': '🧪', 'DevOps': '🚀', 'SRE': '🛠️', 'Data': '📊',
  'Machine Learning': '🤖', 'AI': '🧠', 'Product Manager': '📋',
  'Product Owner': '📋', 'Project Manager': '📋', 'Product Designer': '🎯',
  'UX': '🎨', 'UI': '🎨', 'Tech Lead': '👑', 'Engineering Manager': '👔',
  'CTO': '🏆', 'Scrum Master': '🔄', 'Business Analyst': '📈',
  'Solutions Architect': '🏗️', 'Security': '🔒', 'Cloud': '☁️',
  'Platform': '🧱',
};

export const CONFIG_FILTER_META = {
  'all':    { label: 'Todas',    icon: '🗂️' },
  'active': { label: 'Activas',  icon: '🔥' },
  'closed': { label: 'Cerradas', icon: '📦' },
};

export function getDefaultConfig() {
  return JSON.parse(JSON.stringify({
    lang: DEFAULT_LANG,
    logo: DEFAULT_LOGO,
    background: DEFAULT_BACKGROUND,
    profile: {
      nombre: '',
      apellido: '',
      username: '',
      email: '',
      bio: '',
      avatar: '',
    },
    puestos: {
      activeTags: ROLE_TAGS_LIST.map(t => t.id),
      hidden: [],
      custom: [],
    },
    estadosIniciales: WORKFLOW_STEPS.map(s => s.id),
    estadoInicialDefault: 'Aplicado',
    filtros: [
      { id: 'all',                visible: true },
      { id: 'active',             visible: true },
      { id: 'Guardado',           visible: true },
      { id: 'Aplicado',           visible: true },
      { id: 'Contacto',           visible: true },
      { id: 'Entrevista RRHH',    visible: true },
      { id: 'Challenge técnico',  visible: true },
      { id: 'Live coding',        visible: true },
      { id: 'Entrevista Técnica', visible: true },
      { id: 'Charla con cliente', visible: true },
      { id: 'Referencias',        visible: true },
      { id: 'Negociación',        visible: true },
      { id: 'Oferta',             visible: true },
      { id: 'closed',             visible: true },
    ],
  }));
}

export const STORAGE_KEYS = {
  JOBS: 'jobTrackerV2',
  REFS: 'jobTrackerReferidos',
  THEME: 'jobTrackerTheme',
  CONFIG: 'jobTrackerConfig',
};

export const STORAGE_VERSION = 2;
export const CONFIG_VERSION = 1;

export const SAMPLE_JOBS = [
  // ... (unchanged)
];