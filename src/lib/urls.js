/**
 * URL schemes Keep Tabs reopens on restore. Anything else (`javascript:`,
 * `data:`, `blob:`…) is never opened: a session file is untrusted input.
 */
export const RESTORABLE_SCHEMES = Object.freeze([
	'http:',
	'https:',
	'file:',
	'chrome:',
	'chrome-extension:',
	'edge:',
	'brave:',
	'about:',
]);

/**
 * @param {string} url
 * @returns {string | null} the scheme with its colon (`https:`), or null if the URL is invalid
 */
function schemeOf(url) {
	try {
		return new URL(url).protocol;
	} catch {
		return null;
	}
}

/**
 * Whether a saved URL may be reopened when restoring a session.
 * @param {string} url
 * @returns {boolean}
 */
export function isRestorableUrl(url) {
	const scheme = schemeOf(url);
	return scheme !== null && RESTORABLE_SCHEMES.includes(scheme);
}

/**
 * Whether a URL points to a file on the user's computer. Browsers only let an
 * extension open these when "Allow access to file URLs" is on.
 * @param {string} url
 * @returns {boolean}
 */
export function isLocalFileUrl(url) {
	return schemeOf(url) === 'file:';
}
