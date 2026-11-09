/**
 * Version of the session data format. Increase it on any change that an older
 * Keep Tabs could not read, and keep reading every previous version.
 */
export const SESSION_FORMAT_VERSION = 1;

/** Tab group colors offered by Chromium browsers. */
export const GROUP_COLORS = Object.freeze(['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']);

const WINDOW_STATES = ['normal', 'maximized', 'fullscreen'];
const NO_GROUP = -1;

/**
 * Window as read from the browser (a subset of `chrome.windows.Window`).
 * @typedef {object} CapturedWindow
 * @property {string} [state]
 * @property {number} [left]
 * @property {number} [top]
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * Tab as read from the browser (a subset of `chrome.tabs.Tab`).
 * @typedef {object} CapturedTab
 * @property {string} [url]
 * @property {string} [pendingUrl] URL of a tab that has not finished navigating
 * @property {string} [title]
 * @property {boolean} pinned
 * @property {boolean} active
 * @property {number} groupId -1 when the tab is not in a group
 */

/**
 * Tab group as read from the browser (a subset of `chrome.tabGroups.TabGroup`).
 * @typedef {object} CapturedGroup
 * @property {number} id
 * @property {string} [title]
 * @property {string} color
 * @property {boolean} collapsed
 */

/**
 * @typedef {object} SavedWindow
 * @property {'normal' | 'maximized' | 'fullscreen'} state
 * @property {number} [left]
 * @property {number} [top]
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * @typedef {object} SavedGroup
 * @property {string} title
 * @property {string} color one of {@link GROUP_COLORS}
 * @property {boolean} collapsed
 */

/**
 * @typedef {object} SavedTab
 * @property {string} url
 * @property {string} title
 * @property {boolean} pinned
 * @property {boolean} active
 * @property {number | null} group index in {@link Session.groups}, or null
 */

/**
 * Everything written into a session file.
 * @typedef {object} Session
 * @property {number} format {@link SESSION_FORMAT_VERSION}
 * @property {string} appVersion version of Keep Tabs that saved the file
 * @property {string} createdAt ISO 8601 date and time of the save
 * @property {string} name name chosen for the session
 * @property {boolean} lazyLoading whether non-active tabs are restored without loading
 * @property {SavedWindow} window
 * @property {SavedGroup[]} groups in the order they appear in the window
 * @property {SavedTab[]} tabs in window order
 */

/**
 * Builds the session data from what the browser reports about a window.
 * Browser IDs are not kept: they mean nothing once the window is closed, so
 * tabs refer to their group by its position in `groups`.
 * @param {object} capture
 * @param {string} capture.name
 * @param {string} capture.appVersion
 * @param {Date} capture.createdAt
 * @param {boolean} capture.lazyLoading
 * @param {CapturedWindow} capture.window
 * @param {CapturedTab[]} capture.tabs in window order
 * @param {CapturedGroup[]} capture.groups any order
 * @returns {Session}
 */
export function createSession({ name, appVersion, createdAt, lazyLoading, window: capturedWindow, tabs, groups }) {
	/** @type {SavedGroup[]} */
	const savedGroups = [];
	/** @type {Map<number, number>} browser group ID → index in savedGroups */
	const groupIndexes = new Map();

	const savedTabs = tabs.map((tab) => {
		/** @type {number | null} */
		let group = null;
		if (tab.groupId !== NO_GROUP) {
			if (!groupIndexes.has(tab.groupId)) {
				const captured = groups.find((candidate) => candidate.id === tab.groupId);
				if (captured) {
					groupIndexes.set(tab.groupId, savedGroups.length);
					savedGroups.push(toSavedGroup(captured));
				}
			}
			group = groupIndexes.get(tab.groupId) ?? null;
		}
		return {
			url: tab.url || tab.pendingUrl || '',
			title: tab.title ?? '',
			pinned: tab.pinned,
			active: tab.active,
			group,
		};
	});

	return {
		format: SESSION_FORMAT_VERSION,
		appVersion,
		createdAt: createdAt.toISOString(),
		name,
		lazyLoading,
		window: toSavedWindow(capturedWindow),
		groups: savedGroups,
		tabs: savedTabs,
	};
}

/**
 * @param {CapturedGroup} group
 * @returns {SavedGroup}
 */
function toSavedGroup(group) {
	return {
		title: group.title ?? '',
		color: GROUP_COLORS.includes(group.color) ? group.color : 'grey',
		collapsed: group.collapsed,
	};
}

/**
 * A minimized or locked window is saved as a normal one: it is restored where
 * the user can see it.
 * @param {CapturedWindow} capturedWindow
 * @returns {SavedWindow}
 */
function toSavedWindow(capturedWindow) {
	const state = /** @type {SavedWindow['state']} */ (
		capturedWindow.state && WINDOW_STATES.includes(capturedWindow.state) ? capturedWindow.state : 'normal'
	);
	/** @type {SavedWindow} */
	const saved = { state };
	for (const key of /** @type {const} */ (['left', 'top', 'width', 'height'])) {
		const value = capturedWindow[key];
		if (Number.isFinite(value)) {
			saved[key] = value;
		}
	}
	return saved;
}
