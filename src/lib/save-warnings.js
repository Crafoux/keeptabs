import { isLocalFileUrl, isRestorableUrl } from './urls.js';

/**
 * Tabs the user should hear about before saving.
 * @template {{ url: string }} T
 * @typedef {object} SaveWarnings
 * @property {T[]} localFiles tabs showing a local file that will not reopen
 *   automatically, because "Allow access to file URLs" is off
 * @property {T[]} unrestorable tabs whose content is temporary (`blob:`,
 *   `data:`…) and will never be reopened
 */

/**
 * @template {{ url: string }} T
 * @param {T[]} tabs
 * @param {boolean} fileAccessAllowed whether "Allow access to file URLs" is on
 * @returns {SaveWarnings<T>}
 */
export function findSaveWarnings(tabs, fileAccessAllowed) {
	return {
		localFiles: fileAccessAllowed ? [] : tabs.filter((tab) => isLocalFileUrl(tab.url)),
		unrestorable: tabs.filter((tab) => !isRestorableUrl(tab.url)),
	};
}
