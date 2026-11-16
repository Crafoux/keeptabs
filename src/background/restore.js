import { discardDecision } from '../lib/lazy-loading.js';
import { planRestore } from '../lib/restore-plan.js';
import { InvalidSessionError, readSession } from '../lib/session-reader.js';
import { boundsToTry } from '../lib/window-bounds.js';

/**
 * How long lazy loading waits for a tab to know its address and title before
 * deciding without them. The prototype needed about one second for 8 tabs.
 */
const DISCARD_WAIT_MS = 8000;

/**
 * The first tab of a new window, replaced by the restored tabs. A blank page
 * keeps the window apart from the tabs: the browser may refuse a tab, never
 * this one.
 */
const PLACEHOLDER_URL = 'about:blank';

/**
 * What was built: the browser IDs of the restored tabs that lazy loading puts
 * to sleep.
 * @typedef {object} BuiltWindow
 * @property {number} restoredCount
 * @property {import('../lib/restore-messages.js').MissingTab[]} failed tabs the browser refused to open
 * @property {number[]} sleepyTabIds
 */

/**
 * Restores the session found in a session file.
 *
 * The window is first built completely: tabs, groups, selected tab. Then
 * `report` receives the outcome and, when every tab was reopened, the tab of
 * the session file is closed. Lazy loading comes last, because putting a tab
 * to sleep changes its browser ID.
 * @param {string} text JSON text of the session, untrusted
 * @param {number} fileTabId browser ID of the tab showing the session file
 * @param {(outcome: import('../lib/restore-messages.js').RestoreOutcome) => void} report
 * @returns {Promise<void>}
 * @throws when the window cannot be created; `report` has not been called then
 */
export async function restoreSession(text, fileTabId, report) {
	/** @type {import('../lib/session.js').Session} */
	let session;
	try {
		session = readSession(text);
	} catch (error) {
		if (!(error instanceof InvalidSessionError)) {
			throw error;
		}
		console.error('Keep Tabs: this session file cannot be restored.', error);
		report({ status: 'invalid', reason: error.reason });
		return;
	}

	const plan = planRestore(session, { fileAccessAllowed: await isFileAccessAllowed() });
	const built = plan.tabs.length > 0 ? await buildWindow(plan) : { restoredCount: 0, failed: [], sleepyTabIds: [] };
	const missing = [...plan.skipped, ...built.failed];
	if (missing.length > 0) {
		report({ status: 'incomplete', restoredCount: built.restoredCount, missing });
	} else {
		report({ status: 'restored' });
		// If the file was alone in its window, the window closes with it.
		await step('close the tab of the session file', () => chrome.tabs.remove(fileTabId));
	}
	if (plan.lazyLoading) {
		await Promise.all(built.sleepyTabIds.map(putToSleep));
	}
}

/**
 * Creates the window and its tabs, groups them and selects the saved tab.
 * Only the window itself is required: a tab the browser refuses is reported,
 * and a group that cannot be recreated leaves its tabs ungrouped.
 * @param {import('../lib/restore-plan.js').RestorePlan} plan with at least one tab
 * @returns {Promise<BuiltWindow>}
 */
async function buildWindow(plan) {
	const createdWindow = await createWindow(plan.window.bounds);
	const windowId = createdWindow.id;
	const placeholderId = createdWindow.tabs?.[0]?.id;
	if (windowId === undefined) {
		throw new Error('The new window has no ID');
	}
	if (plan.window.state !== 'normal') {
		await step(`switch the window to ${plan.window.state}`, () => chrome.windows.update(windowId, { state: plan.window.state }));
	}

	/** @type {(number | undefined)[]} browser ID of each planned tab, undefined when refused */
	const tabIds = [];
	/** @type {import('../lib/restore-messages.js').MissingTab[]} */
	const failed = [];
	// One by one, so the tabs keep their order.
	for (const tab of plan.tabs) {
		try {
			const created = await chrome.tabs.create({ windowId, url: tab.url, pinned: tab.pinned, active: false });
			tabIds.push(created.id);
		} catch (error) {
			console.error(`Keep Tabs: the browser refused to open ${tab.url}`, error);
			tabIds.push(undefined);
			failed.push({ url: tab.url, title: tab.title, reason: 'failed' });
		}
	}
	const restoredIds = tabIds.filter((id) => id !== undefined);
	if (restoredIds.length === 0) {
		// A window with only the blank page would be of no use.
		await step('close the empty window', () => chrome.windows.remove(windowId));
		return { restoredCount: 0, failed, sleepyTabIds: [] };
	}

	const collapsedGroupIds = await createGroups(plan, tabIds, windowId);
	const activeId = activeTabId(tabIds, plan.activeIndex);
	if (activeId !== undefined) {
		await step('select the saved tab', () => chrome.tabs.update(activeId, { active: true }));
	}
	if (placeholderId !== undefined) {
		await step('close the blank tab of the new window', () => chrome.tabs.remove(placeholderId));
	}
	// After the selection: a collapsed group cannot hold the selected tab.
	for (const groupId of collapsedGroupIds) {
		await step('collapse a tab group', () => chrome.tabGroups.update(groupId, { collapsed: true }));
	}
	return { restoredCount: restoredIds.length, failed, sleepyTabIds: restoredIds.filter((id) => id !== activeId) };
}

/**
 * The browser refuses bounds that would leave the window mostly outside the
 * screens: each refusal leads to the next, smaller set of bounds.
 * @param {import('../lib/restore-plan.js').WindowBounds} bounds
 * @returns {Promise<chrome.windows.Window>}
 */
async function createWindow(bounds) {
	const attempts = boundsToTry(bounds);
	for (const [index, attempt] of attempts.entries()) {
		try {
			const created = await chrome.windows.create({ url: PLACEHOLDER_URL, focused: true, ...attempt });
			if (!created) {
				throw new Error('The browser did not create the window');
			}
			return created;
		} catch (error) {
			if (index === attempts.length - 1) {
				throw error;
			}
			console.warn('Keep Tabs: the browser refused the window bounds', attempt, 'trying again without them.', error);
		}
	}
	throw new Error('No window bounds to try');
}

/**
 * @param {import('../lib/restore-plan.js').RestorePlan} plan
 * @param {(number | undefined)[]} tabIds browser ID of each planned tab
 * @param {number} windowId
 * @returns {Promise<number[]>} browser IDs of the groups to collapse
 */
async function createGroups(plan, tabIds, windowId) {
	/** @type {number[]} */
	const collapsedGroupIds = [];
	for (const [index, group] of plan.groups.entries()) {
		const groupTabIds = plan.tabs.flatMap((tab, position) => {
			const id = tabIds[position];
			return tab.group === index && id !== undefined ? [id] : [];
		});
		if (groupTabIds.length === 0) {
			// Every tab of the group was refused.
			continue;
		}
		await step(`recreate the tab group "${group.title}"`, async () => {
			const groupId = await chrome.tabs.group({
				tabIds: /** @type {[number, ...number[]]} */ (groupTabIds),
				createProperties: { windowId },
			});
			await chrome.tabGroups.update(groupId, {
				title: group.title,
				color: /** @type {`${chrome.tabGroups.Color}`} */ (group.color),
			});
			if (group.collapsed) {
				collapsedGroupIds.push(groupId);
			}
		});
	}
	return collapsedGroupIds;
}

/**
 * When the saved tab was refused, the next opened tab takes its place, or the
 * last one when none follows, as in the plan.
 * @param {(number | undefined)[]} tabIds
 * @param {number} activeIndex
 * @returns {number | undefined}
 */
function activeTabId(tabIds, activeIndex) {
	for (let index = Math.max(activeIndex, 0); index < tabIds.length; index++) {
		if (tabIds[index] !== undefined) {
			return tabIds[index];
		}
	}
	for (let index = Math.min(activeIndex, tabIds.length) - 1; index >= 0; index--) {
		if (tabIds[index] !== undefined) {
			return tabIds[index];
		}
	}
	return undefined;
}

/**
 * Puts a tab to sleep once it knows its address (see `lazy-loading.js`).
 * @param {number} tabId
 * @returns {Promise<void>}
 */
async function putToSleep(tabId) {
	const decision = await waitForDiscardDecision(tabId);
	if (decision === 'discard') {
		await step('put a tab to sleep', () => chrome.tabs.discard(tabId));
	}
}

/**
 * @param {number} tabId
 * @returns {Promise<'discard' | 'keepLoaded'>}
 */
function waitForDiscardDecision(tabId) {
	return new Promise((resolve) => {
		let finished = false;
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let timer;

		/** @param {'discard' | 'keepLoaded'} decision */
		const finish = (decision) => {
			if (finished) {
				return;
			}
			finished = true;
			clearTimeout(timer);
			chrome.tabs.onUpdated.removeListener(onUpdated);
			resolve(decision);
		};
		/**
		 * @param {chrome.tabs.Tab} tab
		 * @param {boolean} timedOut
		 */
		const consider = (tab, timedOut) => {
			const decision = discardDecision(tab, timedOut);
			if (decision !== 'wait') {
				finish(decision);
			}
		};
		/**
		 * @param {number} id
		 * @param {chrome.tabs.OnUpdatedInfo} _changeInfo
		 * @param {chrome.tabs.Tab} tab
		 */
		const onUpdated = (id, _changeInfo, tab) => {
			if (id === tabId) {
				consider(tab, false);
			}
		};
		// The user may close the tab meanwhile: there is nothing left to do.
		const closed = () => finish('keepLoaded');

		chrome.tabs.onUpdated.addListener(onUpdated);
		timer = setTimeout(() => chrome.tabs.get(tabId).then((tab) => consider(tab, true), closed), DISCARD_WAIT_MS);
		// The tab may already be ready before the listener was added.
		chrome.tabs.get(tabId).then((tab) => consider(tab, false), closed);
	});
}

/**
 * Runs a step the restore can do without: a failure is logged and the restore
 * goes on.
 * @param {string} label what the step does, after "could not"
 * @param {() => Promise<unknown>} action
 * @returns {Promise<void>}
 */
async function step(label, action) {
	try {
		await action();
	} catch (error) {
		console.error(`Keep Tabs: could not ${label}.`, error);
	}
}

/**
 * @returns {Promise<boolean>}
 */
function isFileAccessAllowed() {
	return new Promise((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve));
}
