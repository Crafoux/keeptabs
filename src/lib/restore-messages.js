/**
 * Messages exchanged between the receiver page (`content/receiver.js`) and the
 * service worker (`background/`) while a session file is restored.
 */

/** Type of the message that asks the service worker to restore a session. */
export const RESTORE_REQUEST = 'restoreSession';

/**
 * Sent by the receiver page with the JSON text found in the session file.
 * @typedef {object} RestoreRequest
 * @property {typeof RESTORE_REQUEST} type
 * @property {string} text
 */

/**
 * A saved tab that is not in the restored window.
 * - `unrestorable`, `localFile`: see {@link import('./restore-plan.js').SkipReason}.
 * - `failed`: the browser refused to open it.
 * @typedef {object} MissingTab
 * @property {string} url
 * @property {string} title
 * @property {import('./restore-plan.js').SkipReason | 'failed'} reason
 */

/**
 * Every saved tab was reopened. The service worker then closes the tab of the
 * session file.
 * @typedef {object} RestoredOutcome
 * @property {'restored'} status
 */

/**
 * Some tabs, or all of them, were not reopened. The tab of the session file
 * stays open and lists them.
 * @typedef {object} IncompleteOutcome
 * @property {'incomplete'} status
 * @property {number} restoredCount number of tabs in the restored window, 0 when no window was created
 * @property {MissingTab[]} missing
 */

/**
 * The session file cannot be read: nothing was restored.
 * @typedef {object} InvalidOutcome
 * @property {'invalid'} status
 * @property {import('./session-reader.js').InvalidSessionReason} reason
 */

/**
 * The restore stopped on an error: no window, or an incomplete one.
 * @typedef {object} FailedOutcome
 * @property {'failed'} status
 * @property {string} error for the user, in English: the browser's own message
 */

/**
 * Answer of the service worker to a {@link RestoreRequest}.
 * @typedef {RestoredOutcome | IncompleteOutcome | InvalidOutcome | FailedOutcome} RestoreOutcome
 */
