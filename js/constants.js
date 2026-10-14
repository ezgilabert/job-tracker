// ============================================================
// Domain constants: workflow, states, close reasons, defaults
// ============================================================

export const WORKFLOW_STEPS = [
  { id: 'Saved',               short: 'Saved',       icon: '🔖' },
  { id: 'Applied',             short: 'Applied',     icon: '📤' },
  { id: 'Contact',             short: 'Contact',     icon: '💬' },
  { id: 'HR Interview',        short: 'HR',          icon: '👤' },
  { id: 'Technical Challenge', short: 'Challenge',   icon: '🧪' },
  { id: 'Live Coding',         short: 'Live Coding', icon: '⌨️' },
  { id: 'Technical Interview', short: 'Technical',   icon: '💻' },
  { id: 'Client Interview',    short: 'Client Int.', icon: '🤝' },
  { id: 'Client Chat',         short: 'Client Chat', icon: '☕' },
  { id: 'Final Interview',     short: 'Final',       icon: '🎤' },
  { id: 'References',          short: 'References',  icon: '📞' },
  { id: 'Negotiation',         short: 'Negotiation', icon: '💼' },
  { id: 'Offer',               short: 'Offer',       icon: '🎉' },
];

export const CLOSED_STATES = ['Rejected', 'Ghosted', 'Discarded'];
export const ALL_STATES = [...WORKFLOW_STEPS.map(s => s.id), ...CLOSED_STATES];

export const STATE_ICONS = {
  'Saved':               '🔖',
  'Applied':             '📤',
  'Contact':             '💬',
  'HR Interview':        '👤',
  'Technical Challenge': '🧪',
  'Live Coding':         '⌨️',
  'Technical Interview': '💻',
  'Client Interview':    '🤝',
  'Client Chat':         '☕',
  'Final Interview':     '🎤',
  'References':          '📞',
  'Negotiation':         '💼',
  'Offer':               '🎉',
  'Rejected':            '✕',
  'Ghosted':             '👻',
  'Discarded':           '🚫',
};

export function getStateIcon(status) {
  return STATE_ICONS[status] || '•';
}

export const REF_WORKFLOW_STEPS = [
  { id: 'Pending',         short: 'Pending' },
  { id: 'Contacted',       short: 'Contacted' },
  { id: 'Referred',        short: 'Referred' },
  { id: 'In Process',      short: 'In Process' },
  { id: 'Hired',           short: 'Hired' },
];

export const REF_CLOSED_STATES = ['Not Applicable'];
export const REF_ALL_STATES = [...REF_WORKFLOW_STEPS.map(s => s.id), ...REF_CLOSED_STATES];

export const REF_STATE_ICONS = {
  'Pending':        '⏳',
  'Contacted':      '💬',
  'Referred':       '✅',
  'In Process':     '⏱️',
  'Hired':          '🎉',
  'Not Applicable': '🚫',
};

export function getRefStateIcon(status) {
  return REF_STATE_ICONS[status] || '•';
}

// ============================================================
// Close reasons: i18n keys per close status.
// Actual strings live in js/i18n/es.js and js/i18n/en.js.
// ============================================================
export const CLOSE_REASON_KEYS = {
  'Offer': [
    'close.reason.offer.accepted',
    'close.reason.offer.better',
    'close.reason.offer.first',
  ],
  'Rejected': [
    'close.reason.rejected.profile',
    'close.reason.rejected.tech',
    'close.reason.rejected.other-candidate',
    'close.reason.rejected.requirements',
    'close.reason.rejected.salary',
  ],
  'Ghosted': [
    'close.reason.ghosted.silence',
    'close.reason.ghosted.no-feedback',
    'close.reason.ghosted.cold',
  ],
  'Discarded': [
    'close.reason.discarded.mind-change',
    'close.reason.discarded.company',
    'close.reason.discarded.paused',
    'close.reason.discarded.location',
  ],
};

export const LOGO_OPTIONS = [
  {
    id: 'target',
    label: 'Target',
    description: 'Arrow pointing to the center',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <path d="M12 3 L19 10"/>
      <path d="M15 4 L20 9 L19 10 L14 5 Z" fill="currentColor" stroke="none"/>
    </svg>`,
  },
  {
    id: 'briefcase',
    label: 'Briefcase',
    description: 'Classic work icon',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2"/>
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M3 13h18"/>
      <path d="M12 13v2"/>
    </svg>`,
  },
];

export const DEFAULT_LOGO = 'target';
export const DEFAULT_LANG = 'es';

// ============================================================
// Backgrounds
// ============================================================

export const BACKGROUND_OPTIONS = [
  { id: 'aurora',  label: 'Aurora',    description: 'Animated soft color blobs' },
  { id: 'mesh',    label: 'Mesh',      description: 'Static soft gradient, no animation' },
  { id: 'grid',    label: 'Grid',      description: 'Fine grid with a radial focus' },
  { id: 'dots',    label: 'Dots',      description: 'Minimal dot pattern' },
  { id: 'waves',   label: 'Waves',     description: 'Two slowly moving color blobs' },
  { id: 'conic',   label: 'Conic',     description: 'Slowly rotating conic gradient' },
  { id: 'noise',   label: 'Noise',     description: 'Subtle grain texture over a gradient' },
  { id: 'stripes', label: 'Stripes',   description: 'Thin diagonal lines' },
  { id: 'cosmos',  label: 'Cosmos',    description: 'Starry sky. Best in dark mode' },
  { id: 'blobs',   label: 'Blobs',     description: 'Two large blobs drifting slowly' },
  { id: 'none',    label: 'No background', description: 'Flat default background' },
];

export const DEFAULT_BACKGROUND = 'aurora';

export function applyBackground(bgId) {
  const allClasses = BACKGROUND_OPTIONS.map(o => `bg-${o.id}`);
  document.body.classList.remove(...allClasses);
  if (bgId && bgId !== 'none') {
    document.body.classList.add(`bg-${bgId}`);
  }
}

// ============================================================
// Dashboard styles
// ============================================================

export const DASHBOARD_STYLES = [
  'sparklines',
  'modular',
  'minimal',
  'compact',
  'circular',
  'heatmap',
];

export const DEFAULT_DASHBOARD_STYLE = 'sparklines';

/** Metadata used by the config panel to render the style picker. */
export const DASHBOARD_STYLE_META = [
  { id: 'sparklines', labelKey: 'config.dashboard.sparklines', descKey: 'config.dashboard.sparklinesDesc', preview: 'dash-prev-spark' },
  { id: 'modular',    labelKey: 'config.dashboard.modular',    descKey: 'config.dashboard.modularDesc',    preview: 'dash-prev-mod' },
  { id: 'minimal',    labelKey: 'config.dashboard.minimal',    descKey: 'config.dashboard.minimalDesc',    preview: 'dash-prev-minimal' },
  { id: 'compact',    labelKey: 'config.dashboard.compact',    descKey: 'config.dashboard.compactDesc',    preview: 'dash-prev-compact' },
  { id: 'circular',   labelKey: 'config.dashboard.circular',   descKey: 'config.dashboard.circularDesc',   preview: 'dash-prev-circular' },
  { id: 'heatmap',    labelKey: 'config.dashboard.heatmap',    descKey: 'config.dashboard.heatmapDesc',    preview: 'dash-prev-heatmap' },
];

// ============================================================
// Roles
// ============================================================

export const ROLE_TAGS_LIST = [
  { id: 'programmer', label: 'Programmer',  icon: '💻' },
  { id: 'frontend',   label: 'Frontend',    icon: '🎨' },
  { id: 'backend',    label: 'Backend',     icon: '⚙️' },
  { id: 'fullstack',  label: 'Full Stack',  icon: '🧩' },
  { id: 'mobile',     label: 'Mobile',      icon: '📱' },
  { id: 'qa',         label: 'QA',          icon: '🧪' },
  { id: 'devops',     label: 'DevOps',      icon: '🚀' },
  { id: 'data',       label: 'Data / AI',   icon: '📊' },
  { id: 'security',   label: 'Security',    icon: '🔒' },
  { id: 'leadership', label: 'Leadership',  icon: '👑' },
  { id: 'gamedev',    label: 'Game Dev',    icon: '🎮' },
];

export const NO_ROLE_VALUE = 'Not specified';

export const DEFAULT_ROLES = [
  NO_ROLE_VALUE,
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
  'Software Engineer':          ['programmer'],
  'Software Developer':         ['programmer'],
  'Frontend Developer':         ['programmer', 'frontend'],
  'Backend Developer':          ['programmer', 'backend'],
  'Full Stack Developer':       ['programmer', 'fullstack'],
  'Web Developer':              ['programmer', 'frontend'],
  'Mobile Developer':           ['programmer', 'mobile'],
  'iOS Developer':              ['programmer', 'mobile'],
  'Android Developer':          ['programmer', 'mobile'],
  'Java Developer':             ['programmer', 'backend'],
  'JavaScript Developer':       ['programmer', 'frontend'],
  'TypeScript Developer':       ['programmer'],
  'Python Developer':           ['programmer', 'backend'],
  'Node.js Developer':          ['programmer', 'backend'],
  'React Developer':            ['programmer', 'frontend'],
  'Angular Developer':          ['programmer', 'frontend'],
  'Vue.js Developer':           ['programmer', 'frontend'],
  '.NET Developer':             ['programmer', 'backend'],
  'PHP Developer':              ['programmer', 'backend'],
  'Go Developer':               ['programmer', 'backend'],
  'Ruby Developer':             ['programmer', 'backend'],
  'C++ Developer':              ['programmer', 'backend'],
  'Embedded Software Engineer': ['programmer'],
  'Game Developer':             ['programmer', 'gamedev'],
  'QA Automation Engineer':     ['qa'],
  'DevOps Engineer':            ['devops'],
  'SRE':                        ['devops'],
  'Data Engineer':              ['data'],
  'Machine Learning Engineer':  ['data'],
  'AI Engineer':                ['data'],
  'Security Engineer':          ['security'],
  'Cloud Engineer':             ['devops'],
  'Platform Engineer':          ['devops'],
  'Tech Lead':                  ['leadership'],
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
  'all':    { label: 'All',    icon: '🗂️' },
  'active': { label: 'Active', icon: '🔥' },
  'closed': { label: 'Closed', icon: '📦' },
};

export function getDefaultConfig() {
  return JSON.parse(JSON.stringify({
    lang: DEFAULT_LANG,
    logo: DEFAULT_LOGO,
    background: DEFAULT_BACKGROUND,
    dashboardStyleJobs: DEFAULT_DASHBOARD_STYLE,
    dashboardStyleRefs: DEFAULT_DASHBOARD_STYLE,
    profile: {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      bio: '',
      avatar: '',
    },
    roles: {
      activeTags: ROLE_TAGS_LIST.map(t => t.id),
      hidden: [],
      custom: [],
      customTags: {},
    },
    initialStatuses: WORKFLOW_STEPS.map(s => s.id),
    defaultInitialStatus: 'Applied',
    filters: [
      { id: 'all',                visible: true },
      { id: 'active',             visible: true },
      { id: 'Saved',              visible: true },
      { id: 'Applied',            visible: true },
      { id: 'Contact',            visible: true },
      { id: 'HR Interview',       visible: true },
      { id: 'Technical Challenge', visible: true },
      { id: 'Live Coding',        visible: true },
      { id: 'Technical Interview', visible: true },
      { id: 'Client Chat',        visible: true },
      { id: 'References',         visible: true },
      { id: 'Negotiation',        visible: true },
      { id: 'Offer',              visible: true },
      { id: 'closed',             visible: true },
    ],
  }));
}

export const STORAGE_KEYS = {
  JOBS: 'jobTrackerV2',
  REFS: 'jobTrackerReferrals',
  THEME: 'jobTrackerTheme',
  CONFIG: 'jobTrackerConfig',
};

export const STORAGE_VERSION = 5;
export const CONFIG_VERSION = 3;

// ============================================================
// Backup / Import
// ============================================================
export const BACKUP_APP_ID = 'jobTracker';
export const BACKUP_VERSION = 1;

// Sample data shown to first-time users.
export const SAMPLE_JOBS = [
  {
    id: 1,
    company: 'Acme Corp',
    role: 'Frontend Developer',
    date: '2025-01-15',
    status: 'Applied',
    link: 'https://example.com/jobs/frontend-developer',
    salary: 'USD 4,000 – 5,500',
    hourlySalary: false,
    salaryIsRange: true,
    currency: 'usd',
    workMode: 'hybrid',
    hybridOfficeDays: 3,
    contact: 'Maria Lopez (Recruiter)',
    contactLink: 'https://linkedin.com/in/maria-lopez',
    contactPlatform: 'linkedin',
    notes: 'Referred by a former colleague. Follow up next week.',
    skipped: [],
    wentBack: false,
    history: [
      { status: 'Applied', date: '2025-01-15T12:00:00.000Z' },
    ],
  },
];