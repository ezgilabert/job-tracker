// ============================================================
// Config panel: Profile
//
//   - Avatar with upload / remove.
//   - First name / last name / username / email / bio fields.
//
// Live-preview note: the profile panel does not re-render the
// header — that happens on Save through the PROFILE_CHANGED
// event emitted by the facade's saveDraft().
// ============================================================

import { showToast } from '../../ui/feedback/toast.js';
import { setVal } from '../../app/utils.js';
import { t } from '../../i18n/index.js';

export function mountProfilePanel(host) {
  const avatarEl = document.getElementById('configProfileAvatar');
  const fileInput = document.getElementById('configProfileFileInput');
  const uploadBtn = document.getElementById('configProfileUpload');
  const removeBtn = document.getElementById('configProfileRemove');

  const FIELD_IDS = {
    configProfileFirstName: 'firstName',
    configProfileLastName:  'lastName',
    configProfileUsername:  'username',
    configProfileEmail:     'email',
    configProfileBio:       'bio',
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  function renderFields() {
    const draft = host.getDraft();
    if (!draft) return;
    const p = draft.profile || {};

    setVal('configProfileFirstName', p.firstName || '');
    setVal('configProfileLastName',  p.lastName  || '');
    setVal('configProfileUsername',  p.username  || '');
    setVal('configProfileEmail',     p.email     || '');
    setVal('configProfileBio',       p.bio       || '');
  }

  function renderAvatar() {
    const draft = host.getDraft();
    if (!draft || !avatarEl) return;

    const p = draft.profile || {};
    const svg = avatarEl.querySelector('svg');
    let img = avatarEl.querySelector('img');

    if (p.avatar) {
      if (svg) svg.style.display = 'none';
      if (!img) {
        img = document.createElement('img');
        img.alt = 'Avatar';
        avatarEl.appendChild(img);
      }
      img.src = p.avatar;
    } else {
      if (svg) svg.style.display = '';
      if (img) img.remove();
    }
  }

  function render() {
    renderFields();
    renderAvatar();
  }

  // ----------------------------------------------------------
  // Field bindings
  // ----------------------------------------------------------
  Object.entries(FIELD_IDS).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      const draft = host.getDraft();
      if (!draft) return;
      draft.profile = draft.profile || {};
      draft.profile[key] = el.value;
      host.updateBadge();
    });
  });

  // ----------------------------------------------------------
  // Avatar upload / remove
  // ----------------------------------------------------------
  if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showToast(t('toast.profileImageTooBig'), 'icon-alert-triangle');
        fileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const draft = host.getDraft();
        if (!draft) return;
        draft.profile = draft.profile || {};
        draft.profile.avatar = ev.target.result;
        renderAvatar();
        host.updateBadge();
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      const draft = host.getDraft();
      if (!draft) return;
      draft.profile = draft.profile || {};
      draft.profile.avatar = '';
      renderAvatar();
      host.updateBadge();
    });
  }

  return { render };
}