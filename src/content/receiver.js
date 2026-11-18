import { pluralCategory } from '../lib/plural.js';
import { RESTORE_REQUEST } from '../lib/restore-messages.js';

// Language of the messages actually used, which may differ from the browser's
// when Keep Tabs is not translated into it.
const LANG = chrome.i18n.getMessage('languageCode') || 'en';

/** @type {Record<import('../lib/restore-messages.js').MissingTab['reason'], string>} */
const REASON_KEYS = {
	unrestorable: 'restoreReasonUnrestorable',
	localFile: 'restoreReasonLocalFile',
	failed: 'restoreReasonFailed',
};

const elements = {
	outcome: byId('outcome'),
	missingList: byId('missing-list'),
	openSettings: byId('open-settings'),
	restoreAgain: byId('restore-again'),
	error: byId('error'),
};

let received = false;
let shown = false;

// Opened on its own, outside a session file, the page has nothing to do.
if (window.parent !== window) {
	localizePage();
	elements.openSettings.addEventListener('click', openSettings);
	window.addEventListener('message', receiveSession);
	// Tells the session file that Keep Tabs is installed. Its origin is "null",
	// as for every local file, so the message cannot be addressed to it: it
	// carries nothing but its type.
	window.parent.postMessage({ type: 'keeptabs-ready' }, '*');
}

/**
 * @param {MessageEvent} event
 */
function receiveSession(event) {
	const data = event.data;
	if (event.source !== window.parent || received || typeof data !== 'object' || data === null
		|| data.type !== 'keeptabs-session' || typeof data.session !== 'string') {
		return;
	}
	// One session per opening of the file.
	received = true;
	/** @type {string} */
	const text = data.session;
	if (data.alreadyRestored !== true) {
		restore(text);
		return;
	}
	// The tab was reloaded, or reopened by the browser: restoring again would
	// give a second window, unless the user asks for it.
	elements.outcome.textContent = message('restoreAlreadyDone');
	elements.restoreAgain.addEventListener('click', () => {
		elements.restoreAgain.hidden = true;
		elements.outcome.textContent = message('sessionRestoring');
		restore(text);
	}, { once: true });
	elements.restoreAgain.hidden = false;
	showInFile();
}

/**
 * @param {string} text JSON text of the session
 */
async function restore(text) {
	/** @type {import('../lib/restore-messages.js').RestoreOutcome} */
	let outcome;
	try {
		/** @type {import('../lib/restore-messages.js').RestoreRequest} */
		const request = { type: RESTORE_REQUEST, text };
		outcome = await chrome.runtime.sendMessage(request);
		if (!outcome) {
			throw new Error('Keep Tabs did not answer');
		}
	} catch (error) {
		console.error('Keep Tabs: the restore request failed.', error);
		outcome = { status: 'failed', error: errorText(error) };
	}
	showOutcome(outcome);
}

/**
 * @param {import('../lib/restore-messages.js').RestoreOutcome} outcome
 */
function showOutcome(outcome) {
	switch (outcome.status) {
		case 'restored':
			// Seen only if the tab of the file could not be closed.
			elements.outcome.textContent = message('restoreDone');
			break;
		case 'incomplete':
			elements.outcome.textContent = outcome.restoredCount > 0
				? pluralMessage('restoreIncomplete', outcome.missing.length)
				: message('restoreNothing');
			elements.missingList.replaceChildren(...outcome.missing.map(missingItem));
			elements.missingList.hidden = false;
			elements.openSettings.hidden = !outcome.missing.some((tab) => tab.reason === 'localFile');
			break;
		case 'invalid':
			elements.outcome.textContent = message(outcome.reason === 'newerFormat' ? 'restoreNewerFormat' : 'restoreInvalid');
			break;
		case 'failed':
			elements.outcome.textContent = message('restoreFailed', [outcome.error]);
			break;
	}
	showInFile();
}

/**
 * @param {import('../lib/restore-messages.js').MissingTab} tab
 * @returns {HTMLLIElement}
 */
function missingItem(tab) {
	const item = document.createElement('li');
	const name = document.createElement('span');
	name.textContent = tab.title || tab.url || message('untitledTab');
	const reason = document.createElement('span');
	reason.className = 'reason';
	reason.textContent = message(REASON_KEYS[tab.reason]);
	item.append(name, reason);
	return item;
}

/**
 * Asks the session file to show this frame, at the height of its content, and
 * to follow its changes: the frame is hidden until then, so the first height is
 * only right once it is shown at its real width. Then an error may appear, or
 * the window may become narrower.
 */
function showInFile() {
	if (shown) {
		// The observer already follows every change of the content.
		return;
	}
	shown = true;
	const postHeight = () => {
		// The height of the content, not of the frame: the frame must be able
		// to shrink.
		const height = Math.ceil(document.body.getBoundingClientRect().height);
		window.parent.postMessage({ type: 'keeptabs-report', height }, '*');
	};
	new ResizeObserver(postHeight).observe(document.body);
	postHeight();
}

async function openSettings() {
	elements.error.hidden = true;
	try {
		await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
	} catch (error) {
		console.error('Keep Tabs:', error);
		elements.error.textContent = message('openSettingsFailed', [errorText(error)]);
		elements.error.hidden = false;
	}
}

function localizePage() {
	document.documentElement.lang = LANG;
	for (const element of document.querySelectorAll('[data-i18n]')) {
		const key = element.getAttribute('data-i18n');
		if (key) {
			element.textContent = message(key);
		}
	}
}

/**
 * @param {string} key
 * @param {string[]} [substitutions]
 * @returns {string}
 */
function message(key, substitutions) {
	const text = chrome.i18n.getMessage(key, substitutions);
	if (!text) {
		console.error(`Keep Tabs: missing translation "${key}"`);
		return key;
	}
	return text;
}

/**
 * @param {string} key base of a pair of keys suffixed _one and _other
 * @param {number} count first substitution
 * @returns {string}
 */
function pluralMessage(key, count) {
	return message(`${key}_${pluralCategory(count, LANG)}`, [String(count)]);
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function errorText(error) {
	return error instanceof Error ? error.message : String(error);
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing element #${id} in receiver.html`);
	}
	return element;
}
