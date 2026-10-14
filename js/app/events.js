// ============================================================
// Event bus: typed wrappers around CustomEvent.
//
// The app uses these cross-module signals:
//   - scroll-to-job     → highlight and scroll to a job card
//   - scroll-to-ref     → highlight and scroll to a referral card
//   - i18n-changed      → language switched, re-render dynamic lists
//   - profile-changed   → Settings → Profile saved; sync session
//
// Everything goes through this module so the event names live in
// one place and the payloads stay consistent.
// ============================================================

export const EVENTS = {
  SCROLL_TO_JOB:    'scroll-to-job',
  SCROLL_TO_REF:    'scroll-to-ref',
  I18N_CHANGED:     'i18n-changed',
  PROFILE_CHANGED:  'profile-changed',
};

// ------------------------------------------------------------
// Low-level helpers
// ------------------------------------------------------------
export function emit(name, detail = null) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name, handler) {
  document.addEventListener(name, handler);
  return () => document.removeEventListener(name, handler);
}

// ------------------------------------------------------------
// Typed senders
// ------------------------------------------------------------
export function scrollToJob(jobId) {
  emit(EVENTS.SCROLL_TO_JOB, { jobId });
}

export function scrollToRef(refId) {
  emit(EVENTS.SCROLL_TO_REF, { refId });
}

export function emitI18nChanged() {
  emit(EVENTS.I18N_CHANGED);
}

export function emitProfileChanged(profile) {
  emit(EVENTS.PROFILE_CHANGED, { profile: profile || {} });
}

// ------------------------------------------------------------
// Typed subscribers
// ------------------------------------------------------------
export function onScrollToJob(handler) {
  return on(EVENTS.SCROLL_TO_JOB, handler);
}

export function onScrollToRef(handler) {
  return on(EVENTS.SCROLL_TO_REF, handler);
}

export function onI18nChanged(handler) {
  return on(EVENTS.I18N_CHANGED, handler);
}

export function onProfileChanged(handler) {
  return on(EVENTS.PROFILE_CHANGED, (e) => handler(e.detail?.profile || {}));
}