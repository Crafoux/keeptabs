import { GROUP_COLORS, SESSION_FORMAT_VERSION, WINDOW_STATES } from './session.js';

/**
 * Why a session file cannot be read at all.
 * - `invalid`: not a Keep Tabs session, or damaged.
 * - `newerFormat`: saved by a newer Keep Tabs, in a format this one does not know.
 * @typedef {'invalid' | 'newerFormat'} InvalidSessionReason
 */

/** Thrown when a session file cannot be restored at all. */
export class InvalidSessionError extends Error {
	/**
	 * @param {InvalidSessionReason} reason
	 * @param {string} details for the logs, in English
	 */
	constructor(reason, details) {
		super(`Invalid session: ${details}`);
		this.name = 'InvalidSessionError';
		/** @type {InvalidSessionReason} */
		this.reason = reason;
	}
}

/**
 * Reads the session data embedded in a session file. The file is untrusted
 * input: it may have been edited by hand or written by anyone.
 *
 * The whole file is rejected only when its structure is unusable. Smaller
 * problems are repaired, so that as much as possible is restored: a wrong
 * value takes its default, and a tab without a valid address is kept with an
 * empty one, so it is listed as a tab that could not be reopened.
 * @param {string} text the JSON text of the session
 * @returns {import('./session.js').Session}
 * @throws {InvalidSessionError}
 */
export function readSession(text) {
	/** @type {unknown} */
	let data;
	try {
		data = JSON.parse(text);
	} catch (error) {
		throw new InvalidSessionError('invalid', `not JSON (${error instanceof Error ? error.message : String(error)})`);
	}
	if (!isRecord(data)) {
		throw new InvalidSessionError('invalid', 'not an object');
	}
	const { format } = data;
	if (typeof format !== 'number' || !Number.isInteger(format) || format < 1) {
		throw new InvalidSessionError('invalid', `no valid format version (${String(format)})`);
	}
	if (format > SESSION_FORMAT_VERSION) {
		throw new InvalidSessionError('newerFormat', `format ${format}, this version reads up to ${SESSION_FORMAT_VERSION}`);
	}
	if (!Array.isArray(data.tabs)) {
		throw new InvalidSessionError('invalid', 'no tab list');
	}

	// Positions matter: tabs refer to their group by its index.
	const groups = Array.isArray(data.groups) ? data.groups.map(readGroup) : [];
	return {
		format,
		appVersion: stringOr(data.appVersion, ''),
		createdAt: stringOr(data.createdAt, ''),
		name: stringOr(data.name, ''),
		// The default of the save form.
		lazyLoading: typeof data.lazyLoading === 'boolean' ? data.lazyLoading : true,
		window: readWindow(data.window),
		groups,
		tabs: data.tabs.map((tab) => readTab(tab, groups.length)),
	};
}

/**
 * @param {unknown} value
 * @returns {import('./session.js').SavedWindow}
 */
function readWindow(value) {
	const saved = isRecord(value) ? value : {};
	const state = /** @type {import('./session.js').SavedWindow['state']} */ (
		typeof saved.state === 'string' && WINDOW_STATES.includes(saved.state) ? saved.state : 'normal'
	);
	/** @type {import('./session.js').SavedWindow} */
	const result = { state };
	// The browser only accepts whole numbers, and a size must be positive.
	for (const key of /** @type {const} */ (['left', 'top'])) {
		const coordinate = saved[key];
		if (typeof coordinate === 'number' && Number.isFinite(coordinate)) {
			result[key] = Math.round(coordinate);
		}
	}
	for (const key of /** @type {const} */ (['width', 'height'])) {
		const size = saved[key];
		if (typeof size === 'number' && Number.isFinite(size) && Math.round(size) > 0) {
			result[key] = Math.round(size);
		}
	}
	return result;
}

/**
 * @param {unknown} value
 * @returns {import('./session.js').SavedGroup}
 */
function readGroup(value) {
	const group = isRecord(value) ? value : {};
	return {
		title: stringOr(group.title, ''),
		color: typeof group.color === 'string' && GROUP_COLORS.includes(group.color) ? group.color : 'grey',
		collapsed: group.collapsed === true,
	};
}

/**
 * @param {unknown} value
 * @param {number} groupCount
 * @returns {import('./session.js').SavedTab}
 */
function readTab(value, groupCount) {
	const tab = isRecord(value) ? value : {};
	const { group } = tab;
	return {
		url: stringOr(tab.url, ''),
		title: stringOr(tab.title, ''),
		pinned: tab.pinned === true,
		active: tab.active === true,
		group: typeof group === 'number' && Number.isInteger(group) && group >= 0 && group < groupCount ? group : null,
	};
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} fallback
 * @returns {string}
 */
function stringOr(value, fallback) {
	return typeof value === 'string' ? value : fallback;
}
