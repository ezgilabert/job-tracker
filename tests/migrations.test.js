// ============================================================
// Tests: legacy → current schema migrations
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  migrateJob, migrateRef, migrateConfig,
  mapJobStatus, mapRefStatus, mapWorkMode, mapContactPlatform, mapRelationship,
  mapFilterId,
} from '../js/migrations.js';

// ------------------------------------------------------------
// Small mappers
// ------------------------------------------------------------
test('mapJobStatus: Spanish → English', () => {
  assert.equal(mapJobStatus('Guardado'), 'Saved');
  assert.equal(mapJobStatus('Aplicado'), 'Applied');
  assert.equal(mapJobStatus('Oferta'), 'Offer');
  assert.equal(mapJobStatus('Rechazado'), 'Rejected');
});

test('mapJobStatus: default for missing input', () => {
  assert.equal(mapJobStatus(undefined), 'Saved');
  assert.equal(mapJobStatus(''), 'Saved');
});

test('mapJobStatus: English values pass through', () => {
  assert.equal(mapJobStatus('Applied'), 'Applied');
});

test('mapRefStatus: Spanish → English + legacy alias', () => {
  assert.equal(mapRefStatus('Pendiente'), 'Pending');
  assert.equal(mapRefStatus('No aplica'), 'Not Applicable');
  assert.equal(mapRefStatus('Me va a referir'), 'Contacted');
});

test('mapWorkMode: legacy values', () => {
  assert.equal(mapWorkMode('presencial'), 'onsite');
  assert.equal(mapWorkMode('home'), 'remote');
  assert.equal(mapWorkMode(''), '');
  assert.equal(mapWorkMode(null), '');
});

test('mapContactPlatform: legacy "otro"', () => {
  assert.equal(mapContactPlatform('otro'), 'other');
  assert.equal(mapContactPlatform('linkedin'), 'linkedin');
  assert.equal(mapContactPlatform(undefined), 'other');
});

test('mapRelationship: Spanish → English', () => {
  assert.equal(mapRelationship('Amigo'), 'Friend');
  assert.equal(mapRelationship('Ex-colega'), 'Ex-colleague');
});

test('mapFilterId: Spanish → English + special ids', () => {
  assert.equal(mapFilterId('all'), 'all');
  assert.equal(mapFilterId('Guardado'), 'Saved');
  assert.equal(mapFilterId('Oferta'), 'Offer');
});

// ------------------------------------------------------------
// migrateJob
// ------------------------------------------------------------
test('migrateJob: full Spanish schema → English', () => {
  const old = {
    id: 1,
    empresa: 'Acme',
    puesto: 'Frontend',
    fecha: '2025-01-01',
    estado: 'Aplicado',
    link: 'https://x',
    salario: '3.000–4.000',
    salarioPorHora: true,
    salarioEsRango: false,
    moneda: 'usd',
    modalidad: 'home',
    hybridOfficeDays: null,
    contacto: 'Ana',
    contactoLink: 'a@x.com',
    contactoTipo: 'email',
    notas: 'note',
    skipped: ['Guardado'],
    volvioAtras: true,
    history: [{ estado: 'Aplicado', fecha: '2025-01-01', motivo: 'ok', nota: 'hi', retroceso: false }],
  };
  const migrated = migrateJob(old);
  assert.equal(migrated.company, 'Acme');
  assert.equal(migrated.role, 'Frontend');
  assert.equal(migrated.date, '2025-01-01');
  assert.equal(migrated.status, 'Applied');
  assert.equal(migrated.salary, '3.000–4.000');
  assert.equal(migrated.hourlySalary, true);
  assert.equal(migrated.salaryIsRange, false);
  assert.equal(migrated.currency, 'usd');
  assert.equal(migrated.workMode, 'remote');
  assert.equal(migrated.contact, 'Ana');
  assert.equal(migrated.contactLink, 'a@x.com');
  assert.equal(migrated.contactPlatform, 'email');
  assert.equal(migrated.notes, 'note');
  assert.deepEqual(migrated.skipped, ['Saved']);
  assert.equal(migrated.wentBack, true);
  assert.equal(migrated.history[0].status, 'Applied');
  assert.equal(migrated.history[0].reason, 'ok');
  assert.equal(migrated.history[0].note, 'hi');
});

test('migrateJob: already-English record passes through', () => {
  const modern = {
    id: 2,
    company: 'Globex',
    role: 'Backend',
    status: 'Applied',
    history: [{ status: 'Applied', date: '2025-01-01' }],
  };
  const migrated = migrateJob(modern);
  assert.equal(migrated.company, 'Globex');
  assert.equal(migrated.status, 'Applied');
  assert.equal(migrated.history[0].status, 'Applied');
});

test('migrateJob: defaults applied to partial record', () => {
  const migrated = migrateJob({ id: 3 });
  assert.equal(migrated.company, '');
  assert.equal(migrated.role, '');
  assert.equal(migrated.status, 'Saved');
  assert.equal(migrated.salaryIsRange, true);
  assert.deepEqual(migrated.history, []);
});

// ------------------------------------------------------------
// migrateRef
// ------------------------------------------------------------
test('migrateRef: Spanish schema with relationship string → array', () => {
  const old = {
    id: 1,
    nombre: 'Alice',
    rol: 'Lead',
    contacto: 'a@x',
    link: 'https://x',
    relacion: 'Amigo',
    estado: 'Pendiente',
    empresasVinculadas: ['Acme'],
    notas: 'hi',
    volvioAtras: true,
    history: [{ estado: 'Pendiente', fecha: '2025-01-01' }],
  };
  const migrated = migrateRef(old);
  assert.equal(migrated.name, 'Alice');
  assert.equal(migrated.role, 'Lead');
  assert.deepEqual(migrated.relationship, ['Friend']);
  assert.equal(migrated.status, 'Pending');
  assert.deepEqual(migrated.linkedCompanies, ['Acme']);
  assert.equal(migrated.wentBack, true);
  assert.equal(migrated.history[0].status, 'Pending');
});

test('migrateRef: relationship array with legacy values', () => {
  const old = {
    id: 2,
    nombre: 'Bob',
    relacion: ['Amigo', 'Ex-colega'],
    estado: 'Contactado',
    history: [],
  };
  const migrated = migrateRef(old);
  assert.deepEqual(migrated.relationship, ['Friend', 'Ex-colleague']);
  assert.equal(migrated.status, 'Contacted');
});

test('migrateRef: no relationship → empty array', () => {
  const migrated = migrateRef({ id: 3, nombre: 'C' });
  assert.deepEqual(migrated.relationship, []);
});

// ------------------------------------------------------------
// migrateConfig
// ------------------------------------------------------------
test('migrateConfig: legacy profile.nombre/apellido → firstName/lastName', () => {
  const old = {
    profile: { nombre: 'Ana', apellido: 'Perez', email: 'a@x' },
  };
  const cfg = migrateConfig(old);
  assert.equal(cfg.profile.firstName, 'Ana');
  assert.equal(cfg.profile.lastName, 'Perez');
  assert.equal(cfg.profile.email, 'a@x');
});

test('migrateConfig: legacy roles.puestos → roles', () => {
  const old = {
    puestos: { custom: ['Rust'], hidden: ['PHP'], activeTags: ['programmer'] },
  };
  const cfg = migrateConfig(old);
  assert.deepEqual(cfg.roles.custom, ['Rust']);
  assert.deepEqual(cfg.roles.hidden, ['PHP']);
  assert.deepEqual(cfg.roles.activeTags, ['programmer']);
  assert.equal(cfg.puestos, undefined);
});

test('migrateConfig: legacy estadosIniciales map to English', () => {
  const old = {
    estadosIniciales: ['Guardado', 'Aplicado'],
    estadoInicialDefault: 'Aplicado',
  };
  const cfg = migrateConfig(old);
  assert.deepEqual(cfg.initialStatuses, ['Saved', 'Applied']);
  assert.equal(cfg.defaultInitialStatus, 'Applied');
});

test('migrateConfig: legacy filtros map to English', () => {
  const old = {
    filtros: [
      { id: 'all', visible: true },
      { id: 'Oferta', visible: false },
    ],
  };
  const cfg = migrateConfig(old);
  assert.equal(cfg.filters[0].id, 'all');
  assert.equal(cfg.filters[1].id, 'Offer');
  assert.equal(cfg.filters[1].visible, false);
});

test('migrateConfig: single dashboardStyle → jobs + refs', () => {
  const old = { dashboardStyle: 'circular' };
  const cfg = migrateConfig(old);
  assert.equal(cfg.dashboardStyleJobs, 'circular');
  assert.equal(cfg.dashboardStyleRefs, 'circular');
  assert.equal(cfg.dashboardStyle, undefined);
});

test('migrateConfig: modern dashboardStyleJobs preserved', () => {
  const cfg = migrateConfig({ dashboardStyleJobs: 'compact', dashboardStyleRefs: 'heatmap' });
  assert.equal(cfg.dashboardStyleJobs, 'compact');
  assert.equal(cfg.dashboardStyleRefs, 'heatmap');
});

test('migrateConfig: null / invalid input → defaults', () => {
  const cfg = migrateConfig(null);
  assert.equal(typeof cfg, 'object');
  assert.ok(Array.isArray(cfg.filters));
  assert.ok(Array.isArray(cfg.initialStatuses));
});