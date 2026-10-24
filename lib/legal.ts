/**
 * Who runs SnapBudget and which version of the terms a sign-in agrees to.
 *
 * Bump LEGAL_VERSION whenever either document changes in substance: the auth
 * callback records the version a person ticked the box for, so an old
 * acceptance can be told apart from a current one.
 */
export const LEGAL_VERSION = '2026-10-24';

export const OPERATOR_NAME = 'Madalin Cotetiu';
export const CONTACT_EMAIL = 'cotetiumadalin@gmail.com';

/** The date shown as "last updated" on both pages, from LEGAL_VERSION. */
export const LEGAL_UPDATED_LABEL = new Date(`${LEGAL_VERSION}T00:00:00Z`).toLocaleDateString(
  'ro-RO',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' },
);
