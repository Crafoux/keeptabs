import { isLocalFileUrl, isRestorableUrl } from './urls.js';

/**
 * Why a saved tab is not reopened.
 * - `unrestorable`: its address is not one Keep Tabs opens (see `urls.js`).
 * - `localFile`: it shows a local file and "Allow access to file URLs" is off.
 * @typedef {'unrestorable' | 'localFile'} SkipReason
 */

/**
 * @typedef {object} SkippedTab
 * @property {string} url
 * @property {string} title
 * @property {SkipReason} reason
 */

/**
 * @typedef {object} PlannedTab
 * @property {string} url
 * @property {boolean} pinned
 * @property {number | null} group index in {@link RestorePlan.groups}, or null
 */

/**
 * What to create, in order, to restore a session.
 * @typedef {object} RestorePlan
 * @property {import('./session.js').SavedWindow} window
 * @property {boolean} lazyLoading
 * @property {import('./session.js').SavedGroup[]} groups groups to create, each with at least one tab
 * @property {PlannedTab[]} tabs tabs to open, in window order
 * @property {number} activeIndex index in `tabs` of the tab to select, -1 when there is no tab
 * @property {SkippedTab[]} skipped tabs that are not reopened, in window order
 */

/**
 * Decides what to restore from a session that `readSession` has checked.
 *
 * The plan only contains what the browser accepts: pinned tabs come first and
 * are never grouped, each group is a single run of adjacent tabs, and the
 * group of the selected tab is not collapsed. A file saved by Keep Tabs
 * already follows these rules; a file edited by hand may not.
 * @param {import('./session.js').Session} session
 * @param {object} options
 * @param {boolean} options.fileAccessAllowed whether "Allow access to file URLs" is on
 * @returns {RestorePlan}
 */
export function planRestore(session, { fileAccessAllowed }) {
	// The browser puts pinned tabs first anyway.
	const ordered = [...session.tabs.filter((tab) => tab.pinned), ...session.tabs.filter((tab) => !tab.pinned)];
	const savedActive = ordered.findIndex((tab) => tab.active);

	/** @type {import('./session.js').SavedGroup[]} */
	const groups = [];
	/** @type {PlannedTab[]} */
	const tabs = [];
	/** @type {SkippedTab[]} */
	const skipped = [];
	let activeIndex = -1;
	// Saved group of the last tab opened, and the planned group made from it.
	/** @type {number | null} */
	let previousSavedGroup = null;
	let previousGroup = -1;

	ordered.forEach((tab, position) => {
		const reason = skipReason(tab.url, fileAccessAllowed);
		if (reason) {
			skipped.push({ url: tab.url, title: tab.title, reason });
			return;
		}
		/** @type {number | null} */
		let group = null;
		const savedGroup = tab.pinned ? null : tab.group;
		if (savedGroup !== null) {
			// Tabs of one saved group that are not adjacent become separate groups
			// with the same look, so the order of the tabs is kept. Skipped tabs
			// do not split a group.
			if (savedGroup !== previousSavedGroup) {
				previousGroup = groups.length;
				groups.push({ ...session.groups[savedGroup] });
			}
			group = previousGroup;
		}
		previousSavedGroup = savedGroup;
		// When the selected tab is skipped, the next tab opened takes its place.
		if (activeIndex === -1 && position >= savedActive) {
			activeIndex = tabs.length;
		}
		tabs.push({ url: tab.url, pinned: tab.pinned, group });
	});

	if (activeIndex === -1) {
		// The selected tab was skipped and no tab follows it.
		activeIndex = tabs.length - 1;
	}
	const activeGroup = tabs[activeIndex]?.group ?? null;
	if (activeGroup !== null) {
		// A collapsed group hides its tabs, and the selected tab must be visible.
		groups[activeGroup].collapsed = false;
	}

	return {
		window: { ...session.window },
		lazyLoading: session.lazyLoading,
		groups,
		tabs,
		activeIndex,
		skipped,
	};
}

/**
 * @param {string} url
 * @param {boolean} fileAccessAllowed
 * @returns {SkipReason | null}
 */
function skipReason(url, fileAccessAllowed) {
	if (!isRestorableUrl(url)) {
		return 'unrestorable';
	}
	if (!fileAccessAllowed && isLocalFileUrl(url)) {
		return 'localFile';
	}
	return null;
}
