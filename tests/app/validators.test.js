// ============================================================
// Tests: form and payload validators
// ============================================================

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateContactLink,
  validateJobPayload,
  validateRefPayload,
} from '../../js/app/validators.js';

// ------------------------------------------------------------
// validateContactLink
// ------------------------------------------------------------
test('validateContactLink: empty link is always valid (optional field)', () => {
  assert.deepEqual(validateContactLink('linkedin', ''), { valid: true });
  assert.deepEqual(validateContactLink('email', null), { valid: true });
  assert.deepEqual(validateContactLink('whatsapp', '   '), { valid: true });
});

test('validateContactLink: linkedin format validation', () => {
  assert.equal(validateContactLink('linkedin', 'https://linkedin.com/in/john-doe').valid, true);
  assert.equal(validateContactLink('linkedin', 'linkedin.com/company/acme').valid, true);
  assert.equal(validateContactLink('linkedin', 'not-a-linkedin-link').valid, false);
  assert.equal(validateContactLink('linkedin', 'not-a-linkedin-link').errorKey, 'form.contactLink.error.linkedin');
});

test('validateContactLink: email format validation', () => {
  assert.equal(validateContactLink('email', 'test@example.com').valid, true);
  assert.equal(validateContactLink('email', 'invalid-email').valid, false);
  assert.equal(validateContactLink('email', 'invalid-email').errorKey, 'form.contactLink.error.email');
});

test('validateContactLink: whatsapp format validation', () => {
  assert.equal(validateContactLink('whatsapp', '+54 9 11 1234-5678').valid, true);
  assert.equal(validateContactLink('whatsapp', '12345').valid, false); // < 8 digits
  assert.equal(validateContactLink('whatsapp', 'abc12345678').valid, false); // invalid characters
});

test('validateContactLink: other format validation', () => {
  assert.equal(validateContactLink('other', 'https://example.com/job').valid, true);
  assert.equal(validateContactLink('other', 'example.com/job').valid, true);
  assert.equal(validateContactLink('other', 'invalid link with spaces').valid, false);
});

// ------------------------------------------------------------
// validateJobPayload
// ------------------------------------------------------------
test('validateJobPayload: valid payload with job link passes', () => {
  const result = validateJobPayload({
    company: 'Acme Corp',
    role: 'Frontend Dev',
    status: 'Applied',
    date: '2026-10-15',
    salary: 'USD 5,000',
    link: 'https://acme.com/jobs/1',
  });
  assert.equal(result.valid, true);
});

test('validateJobPayload: valid payload with contact details passes', () => {
  const result = validateJobPayload({
    company: 'Acme Corp',
    role: 'Frontend Dev',
    status: 'Applied',
    date: '2026-10-15',
    salary: 'USD 5,000',
    contact: 'Jane Recruiter',
    contactLink: 'https://linkedin.com/in/jane',
    contactPlatform: 'linkedin',
  });
  assert.equal(result.valid, true);
});

test('validateJobPayload: company is required', () => {
  const result = validateJobPayload({
    company: '',
    role: 'Frontend Dev',
    date: '2026-10-15',
    salary: '5000',
    link: 'https://x.com',
  });
  assert.equal(result.valid, false);
  assert.equal(result.field, 'company');
});

test('validateJobPayload: role is required unless status is Saved', () => {
  const appliedNoRole = validateJobPayload({
    company: 'Acme',
    role: '',
    status: 'Applied',
    date: '2026-10-15',
    salary: '5000',
    link: 'https://x.com',
  });
  assert.equal(appliedNoRole.valid, false);
  assert.equal(appliedNoRole.errorKey, 'toast.roleRequired');

  const savedNoRole = validateJobPayload({
    company: 'Acme',
    role: '',
    status: 'Saved',
    date: '2026-10-15',
    salary: '5000',
    link: 'https://x.com',
  });
  assert.equal(savedNoRole.valid, true);
});

test('validateJobPayload: date is required', () => {
  const result = validateJobPayload({
    company: 'Acme',
    role: 'Dev',
    status: 'Applied',
    date: '',
    salary: '5000',
    link: 'https://x.com',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.dateRequired');
});

test('validateJobPayload: salary is required', () => {
  const result = validateJobPayload({
    company: 'Acme',
    role: 'Dev',
    status: 'Applied',
    date: '2026-10-15',
    salary: '',
    link: 'https://x.com',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.salaryRequired');
});

test('validateJobPayload: requires either job link OR complete contact info', () => {
  const noLinkOrContact = validateJobPayload({
    company: 'Acme',
    role: 'Dev',
    status: 'Applied',
    date: '2026-10-15',
    salary: '5000',
  });
  assert.equal(noLinkOrContact.valid, false);
  assert.equal(noLinkOrContact.errorKey, 'toast.linkOrContactRequired');

  const onlyContactName = validateJobPayload({
    company: 'Acme',
    role: 'Dev',
    status: 'Applied',
    date: '2026-10-15',
    salary: '5000',
    contact: 'Jane',
  });
  assert.equal(onlyContactName.valid, false);
  assert.equal(onlyContactName.errorKey, 'toast.linkOrContactRequired');
});

// ------------------------------------------------------------
// validateRefPayload
// ------------------------------------------------------------
test('validateRefPayload: valid referral passes', () => {
  const result = validateRefPayload({
    name: 'Carlos Garcia',
    role: 'Tech Lead @ Google',
    contact: 'carlos@google.com',
    relationship: ['Ex-colleague'],
    status: 'Pending',
  });
  assert.equal(result.valid, true);
});

test('validateRefPayload: name is required', () => {
  const result = validateRefPayload({
    name: '',
    role: 'Tech Lead',
    contact: 'carlos@google.com',
    relationship: ['Friend'],
    status: 'Pending',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.refNameRequired');
});

test('validateRefPayload: role / company is required', () => {
  const result = validateRefPayload({
    name: 'Carlos',
    role: '',
    contact: 'carlos@google.com',
    relationship: ['Friend'],
    status: 'Pending',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.refRoleRequired');
});

test('validateRefPayload: contact OR link is required', () => {
  const result = validateRefPayload({
    name: 'Carlos',
    role: 'Dev',
    contact: '',
    link: '',
    relationship: ['Friend'],
    status: 'Pending',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.refContactOrLinkRequired');
});

test('validateRefPayload: relationship is required (non-empty array)', () => {
  const result = validateRefPayload({
    name: 'Carlos',
    role: 'Dev',
    contact: 'carlos@google.com',
    relationship: [],
    status: 'Pending',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.refRelationshipRequired');
});

test('validateRefPayload: status is required', () => {
  const result = validateRefPayload({
    name: 'Carlos',
    role: 'Dev',
    contact: 'carlos@google.com',
    relationship: ['Friend'],
    status: '',
  });
  assert.equal(result.valid, false);
  assert.equal(result.errorKey, 'toast.refStatusRequired');
});
