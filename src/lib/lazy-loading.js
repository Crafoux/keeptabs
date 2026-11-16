/**
 * Restored tab as the browser reports it (a subset of `chrome.tabs.Tab`).
 * @typedef {object} LoadingTab
 * @property {string} [url] address of the page shown, empty until the navigation is committed
 * @property {string} [pendingUrl] address being loaded, set until the navigation is committed
 * @property {string} [title]
 * @property {string} [status] `loading` or `complete`
 * @property {boolean} [active] whether it is the selected tab of its window
 */

/**
 * What to do with a tab that lazy loading puts to sleep.
 * - `discard`: put it to sleep now.
 * - `wait`: ask again when the tab changes.
 * - `keepLoaded`: never put it to sleep.
 * @typedef {'discard' | 'wait' | 'keepLoaded'} DiscardDecision
 */

/**
 * Decides when a restored tab can be put to sleep (discarded).
 *
 * A tab discarded before its address is known becomes an empty `about:blank`
 * tab: the address is lost. Such a tab is kept loaded when it is still unknown
 * after the waiting time. A tab discarded before its title is known shows its
 * address instead, which is acceptable once the waiting time is over. A tab
 * the user selects meanwhile is kept loaded: they are using it.
 * @param {LoadingTab} tab
 * @param {boolean} timedOut whether the waiting time is over
 * @returns {DiscardDecision}
 */
export function discardDecision(tab, timedOut) {
	if (tab.active) {
		return 'keepLoaded';
	}
	const urlKnown = Boolean(tab.url) && !tab.pendingUrl;
	if (!urlKnown) {
		return timedOut ? 'keepLoaded' : 'wait';
	}
	const titleKnown = tab.status === 'complete' || (Boolean(tab.title) && tab.title !== tab.url);
	return titleKnown || timedOut ? 'discard' : 'wait';
}
