import { RESTORE_REQUEST } from '../lib/restore-messages.js';
import { RECEIVER_PATH } from '../lib/session-file.js';
import { restoreSession } from './restore.js';

const RECEIVER_URL = chrome.runtime.getURL(RECEIVER_PATH);
const WELCOME_PATH = 'welcome/welcome.html';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
	// Only on a first install: not on updates, nor when the browser updates.
	if (reason !== chrome.runtime.OnInstalledReason.INSTALL) {
		return;
	}
	try {
		await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_PATH) });
	} catch (error) {
		console.error('Keep Tabs: could not open the welcome page.', error);
	}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	const fileTabId = sender.tab?.id;
	if (!isRestoreRequest(message) || !isFromReceiver(sender) || fileTabId === undefined) {
		return false;
	}
	let answered = false;
	/** @param {import('../lib/restore-messages.js').RestoreOutcome} outcome */
	const report = (outcome) => {
		answered = true;
		sendResponse(outcome);
	};
	restoreSession(message.text, fileTabId, report).catch((/** @type {unknown} */ error) => {
		console.error('Keep Tabs: the window could not be restored.', error);
		if (!answered) {
			report({ status: 'failed', error: error instanceof Error ? error.message : String(error) });
		}
	});
	// The answer is sent once the window is built.
	return true;
});

/**
 * @param {unknown} message
 * @returns {message is import('../lib/restore-messages.js').RestoreRequest}
 */
function isRestoreRequest(message) {
	return typeof message === 'object' && message !== null
		&& 'type' in message && message.type === RESTORE_REQUEST
		&& 'text' in message && typeof message.text === 'string';
}

/**
 * Only the receiver page, inside the tab of a session file, may ask for a
 * restore: never another page or extension.
 * @param {chrome.runtime.MessageSender} sender
 * @returns {boolean}
 */
function isFromReceiver(sender) {
	return sender.id === chrome.runtime.id && sender.url === RECEIVER_URL;
}
