// ============================================================
// Migrations: legacy (Spanish) schema -> current (English) schema.
//
// Two callers:
//   1. Store constructor via the `migrate` option (runs once on
//      first load after a version bump).
//   2. Backup import (configController) so old backups keep working.
//
// New installs never touch these tables.
// ============================================================

import { getDefaultConfig, DEFAULT_DASHBOARD_STYLE } from './constants.js';
import { ensureArray } from './utils.js';

// ------------------------------------------------------------
// Field-value maps (Spanish -> English)
// ------------------------------------------------------------
export const JOB_STATUS_MAP = {
  'Guardado':               'Saved',
  'Aplicado':               'Applied',
  'Contacto':               'Contact',
  'Entrevista RRHH':        'HR Interview',
  'Challenge técnico':      'Technical Challenge',
  'Live coding':            'Live Coding',
  'Entrevista Técnica':     'Technical Interview',
  'Entrevista con cliente': 'Client Interview',
  'Charla con cliente':     'Client Chat',
  'Entrevista Final':       'Final Interview',
  'Referencias':            'References',
  'Negociación':            'Negotiation',
  'Oferta':                 'Offer',
  'Rechazado':              'Rejected',
  'Ghosted':                'Ghosted',
  'Descartado':             'Discarded',
};

export const REF_STATUS_MAP = {
  'Pendiente':       'Pending',
  'Contactado':      'Contacted',
  'Referido hecho':  'Referred',
  'En proceso':      'In Process',
  'Contratado':      'Hired',
  'No aplica':       'Not Applicable',
  // Legacy state that predates the previous rename.
  'Me va a referir': 'Contacted',
};

export const RELATIONSHIP_MAP = {
  'Amigo':     'Friend',
  'Ex-colega': 'Ex-colleague',
  'Familiar':  'Family',
  'Conocido':  'Acquaintance',
  'Recruiter': 'Recruiter',
  'Mentor':    'Mentor',
};

export const CONTACT_PLATFORM_MAP = {
  'linkedin': 'linkedin',
  'email':    'email',
  'whatsapp': 'whatsapp',
  'otro':     'other',
  'other':    'other',
};

export const WORK_MODE_MAP = {
  'presencial': 'onsite',
  'home':       'remote',
  'hybrid':     'hybrid',
  'onsite':     'onsite',
  'remote':     'remote',
  '':           '',
};

export const FILTER_ID_MAP = {
  'all':                    'all',
  'active':                 'active',
  'closed':                 'closed',
  'Guardado':               'Saved',
  'Aplicado':               'Applied',
  'Contacto':               'Contact',
  'Entrevista RRHH':        'HR Interview',
  'Challenge técnico':      'Technical Challenge',
  'Live coding':            'Live Coding',
  'Entrevista Técnica':     'Technical Interview',
  'Entrevista con cliente': 'Client Interview',
  'Charla con cliente':     'Client Chat',
  'Entrevista Final':       'Final Interview',
  'Referencias':            'References',
  'Negociación':            'Negotiation',
  'Oferta':                 'Offer',
  'Rechazado':              'Rejected',
  'Ghosted':                'Ghosted',
  'Descartado':             'Discarded',
};

// ------------------------------------------------------------
// Small mappers
// ------------------------------------------------------------
export const mapJobStatus = (s) => (s ? (JOB_STATUS_MAP[s] || s) : 'Saved');
export const mapRefStatus = (s) => (s ? (REF_STATUS_MAP[s] || s) : 'Pending');
export const mapRelationship = (r) => (r ? (RELATIONSHIP_MAP[r] || r) : r);
export const mapContactPlatform = (p) => (p ? (CONTACT_PLATFORM_MAP[p] || p) : 'other');
export const mapWorkMode = (m) => {
  if (m === undefined || m === null) return '';
  return WORK_MODE_MAP[m] ?? m;
};
export const mapFilterId = (id) => FILTER_ID_MAP[id] || id;

// ------------------------------------------------------------
// Job migration
// ------------------------------------------------------------
export function migrateJob(j) {
  if (!j || typeof j !== 'object') return j;

  const hourlyRaw   = j.hourlySalary   ?? j.salarioPorHora;
  const rangeRaw    = j.salaryIsRange  ?? j.salarioEsRango;
  const wentBackRaw = j.wentBack       ?? j.volvioAtras;

  return {
    id: j.id,
    company:  j.company  ?? j.empresa  ?? '',
    role:     j.role     ?? j.puesto   ?? '',
    date:     j.date     ?? j.fecha    ?? '',
    status:   mapJobStatus(j.status ?? j.estado),
    link:     j.link ?? '',
    salary:   j.salary   ?? j.salario  ?? '',
    hourlySalary:  Boolean(hourlyRaw),
    salaryIsRange: rangeRaw === undefined ? true : Boolean(rangeRaw),
    currency: j.currency ?? j.moneda ?? 'usd',
    workMode: mapWorkMode(j.workMode ?? j.modalidad),
    hybridOfficeDays: j.hybridOfficeDays ?? null,
    contact:  j.contact   ?? j.contacto       ?? '',
    contactLink:     j.contactLink     ?? j.contactoLink     ?? '',
    contactPlatform: mapContactPlatform(j.contactPlatform ?? j.contactoTipo),
    notes:    j.notes ?? j.notas ?? '',
    skipped: ensureArray(j.skipped).map(mapJobStatus),
    wentBack: Boolean(wentBackRaw),
    offerConfirmed: Boolean(j.offerConfirmed),
    history: ensureArray(j.history).map(h => ({
      status:   mapJobStatus(h.status ?? h.estado),
      date:     h.date ?? h.fecha,
      reason:   h.reason ?? h.motivo,
      note:     h.note   ?? h.nota,
      wentBack: Boolean(h.wentBack ?? h.retroceso),
    })),
  };
}

// ------------------------------------------------------------
// Referral migration
// ------------------------------------------------------------
export function migrateRef(r) {
  if (!r || typeof r !== 'object') return r;

  const rawRelationship = r.relationship ?? r.relacion;
  const relationship = Array.isArray(rawRelationship)
    ? rawRelationship.map(mapRelationship)
    : (rawRelationship ? [mapRelationship(rawRelationship)] : []);

  const wentBackRaw = r.wentBack ?? r.volvioAtras;

  return {
    id: r.id,
    name:     r.name    ?? r.nombre    ?? '',
    role:     r.role    ?? r.rol       ?? '',
    contact:  r.contact ?? r.contacto  ?? '',
    link:     r.link    ?? r.linkedin  ?? '',
    relationship,
    status:   mapRefStatus(r.status ?? r.estado),
    linkedCompanies: ensureArray(r.linkedCompanies ?? r.empresasVinculadas),
    linkedJobId: r.linkedJobId ?? null,
    notes:    r.notes ?? r.notas ?? '',
    wentBack: Boolean(wentBackRaw),
    createdAt: r.createdAt || new Date().toISOString(),
    history: ensureArray(r.history).map(h => ({
      status:   mapRefStatus(h.status ?? h.estado),
      date:     h.date ?? h.fecha,
      reason:   h.reason ?? h.motivo,
      note:     h.note   ?? h.nota,
      wentBack: Boolean(h.wentBack ?? h.retroceso),
    })),
  };
}

// ------------------------------------------------------------
// Config migration
// ------------------------------------------------------------
const DEFAULT_ROLE_TAG_IDS = [
  'programmer', 'frontend', 'backend', 'fullstack', 'mobile', 'qa',
  'devops', 'data', 'security', 'leadership', 'gamedev',
];

export function migrateConfig(data) {
  if (!data || typeof data !== 'object') return getDefaultConfig();

  const defaults = getDefaultConfig();
  const out = { ...defaults, ...data };

  // ---- Profile ----
  const oldProfile = data.profile || {};
  out.profile = {
    ...defaults.profile,
    firstName: oldProfile.firstName ?? oldProfile.nombre   ?? '',
    lastName:  oldProfile.lastName  ?? oldProfile.apellido ?? '',
    username:  oldProfile.username  ?? '',
    email:     oldProfile.email     ?? '',
    bio:       oldProfile.bio       ?? '',
    avatar:    oldProfile.avatar    ?? '',
  };

  // ---- Roles ----
  const oldRoles = data.roles || data.puestos || {};
  out.roles = {
    activeTags: oldRoles.activeTags || DEFAULT_ROLE_TAG_IDS,
    hidden:     oldRoles.hidden     || [],
    custom:     oldRoles.custom     || [],
    customTags: oldRoles.customTags || {},
  };
  delete out.puestos;

  // ---- Initial statuses ----
  const oldStatuses = data.initialStatuses ?? data.estadosIniciales;
  if (Array.isArray(oldStatuses)) {
    out.initialStatuses = oldStatuses.map(mapJobStatus);
  }
  delete out.estadosIniciales;

  const oldDefault = data.defaultInitialStatus ?? data.estadoInicialDefault;
  if (oldDefault) {
    out.defaultInitialStatus = mapJobStatus(oldDefault);
  }
  delete out.estadoInicialDefault;

  // ---- Filters ----
  const oldFilters = data.filters ?? data.filtros;
  if (Array.isArray(oldFilters)) {
    out.filters = oldFilters.map(f => ({
      id: mapFilterId(f.id),
      visible: f.visible !== false,
    }));
  }
  delete out.filtros;

  // ---- Dashboard styles (legacy single field) ----
  if (data.dashboardStyle && !data.dashboardStyleJobs && !data.dashboardStyleRefs) {
    out.dashboardStyleJobs = data.dashboardStyle;
    out.dashboardStyleRefs = data.dashboardStyle;
  }
  if (!out.dashboardStyleJobs) out.dashboardStyleJobs = DEFAULT_DASHBOARD_STYLE;
  if (!out.dashboardStyleRefs) out.dashboardStyleRefs = DEFAULT_DASHBOARD_STYLE;
  delete out.dashboardStyle;

  return out;
}