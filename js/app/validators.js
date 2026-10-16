// ============================================================
// Validators: pure functions for form and payload validation.
// ============================================================

export const LINK_VALIDATORS = {
  linkedin(value) {
    if (!value) return null;
    const clean = value
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '');
    if (!/^linkedin\.com\/(in|company|pub|school|showcase)\/[\w\-%.]+\/?$/i.test(clean)) {
      return 'form.contactLink.error.linkedin';
    }
    return null;
  },

  email(value) {
    if (!value) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return 'form.contactLink.error.email';
    }
    return null;
  },

  whatsapp(value) {
    if (!value) return null;
    const trimmed = value.trim();
    if (!/^[\d\s+\-().]+$/.test(trimmed)) {
      return 'form.contactLink.error.whatsapp';
    }
    const digits = trimmed.replace(/[^\d]/g, '');
    if (digits.length < 8) {
      return 'form.contactLink.error.whatsapp';
    }
    return null;
  },

  other(value) {
    if (!value) return null;
    const v = value.trim();
    if (/^https?:\/\/\S+$/i.test(v)) return null;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return null;
    if (/^(mailto|tel):\S+$/i.test(v)) return null;
    return 'form.contactLink.error.url';
  },
};

/**
 * Validates a contact link given its platform.
 *
 * @param {string} platform  'linkedin' | 'email' | 'whatsapp' | 'other'
 * @param {string} [link]
 * @returns {{ valid: boolean, errorKey?: string }}
 */
export function validateContactLink(platform, link = '') {
  const trimmed = String(link || '').trim();
  if (!trimmed) return { valid: true };

  const validator = LINK_VALIDATORS[platform] || LINK_VALIDATORS.other;
  const errorKey = validator(trimmed);
  return errorKey ? { valid: false, errorKey } : { valid: true };
}

/**
 * Validates an application payload before creation or update.
 *
 * @param {{
 *   company?: string,
 *   role?: string,
 *   status?: string,
 *   date?: string,
 *   salary?: string,
 *   link?: string,
 *   contact?: string,
 *   contactLink?: string,
 *   contactPlatform?: string,
 * }} data
 * @returns {{ valid: boolean, errorKey?: string, field?: string }}
 */
export function validateJobPayload(data = {}) {
  const company = String(data.company || '').trim();
  const role = String(data.role || '').trim();
  const status = String(data.status || 'Applied').trim();
  const date = String(data.date || '').trim();
  const salary = String(data.salary || '').trim();
  const link = String(data.link || '').trim();
  const contact = String(data.contact || '').trim();
  const contactLink = String(data.contactLink || '').trim();
  const contactPlatform = data.contactPlatform || 'linkedin';

  // 1. Company required (max 120 chars)
  if (!company) {
    return { valid: false, errorKey: 'form.company', field: 'company' };
  }

  // 2. Role required unless "Saved"
  if (!role && status !== 'Saved') {
    return { valid: false, errorKey: 'toast.roleRequired', field: 'role' };
  }

  // 3. Contact link format (if filled)
  if (contactLink) {
    const contactRes = validateContactLink(contactPlatform, contactLink);
    if (!contactRes.valid) {
      return { valid: false, errorKey: contactRes.errorKey, field: 'contactLink' };
    }
  }

  // 4. Date required
  if (!date) {
    return { valid: false, errorKey: 'toast.dateRequired', field: 'date' };
  }

  // 5. Salary required
  if (!salary) {
    return { valid: false, errorKey: 'toast.salaryRequired', field: 'salary' };
  }

  // 6. Must have either job link OR complete contact (name + valid contact link)
  const hasLink = Boolean(link);
  const hasFullContact = Boolean(contact) && Boolean(contactLink);
  if (!hasLink && !hasFullContact) {
    return { valid: false, errorKey: 'toast.linkOrContactRequired', field: 'link' };
  }

  return { valid: true };
}

/**
 * Validates a referral payload before creation or update.
 *
 * @param {{
 *   name?: string,
 *   role?: string,
 *   contact?: string,
 *   link?: string,
 *   relationship?: string[],
 *   status?: string,
 * }} data
 * @returns {{ valid: boolean, errorKey?: string, field?: string }}
 */
export function validateRefPayload(data = {}) {
  const name = String(data.name || '').trim();
  const role = String(data.role || '').trim();
  const contact = String(data.contact || '').trim();
  const link = String(data.link || '').trim();
  const relationship = Array.isArray(data.relationship) ? data.relationship : [];
  const status = String(data.status || '').trim();

  // 1. Name required
  if (!name) {
    return { valid: false, errorKey: 'toast.refNameRequired', field: 'refName' };
  }

  // 2. Role / Company required
  if (!role) {
    return { valid: false, errorKey: 'toast.refRoleRequired', field: 'refRole' };
  }

  // 3. Contact OR Link required
  if (!contact && !link) {
    return { valid: false, errorKey: 'toast.refContactOrLinkRequired', field: 'refContact' };
  }

  // 4. Relationship required
  if (relationship.length === 0) {
    return { valid: false, errorKey: 'toast.refRelationshipRequired', field: 'refRelationship' };
  }

  // 5. Status required
  if (!status) {
    return { valid: false, errorKey: 'toast.refStatusRequired', field: 'refStatus' };
  }

  return { valid: true };
}
