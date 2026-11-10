import { defaultFileName, hasHtmlExtension, sessionNameOf, toFileName } from '../lib/file-name.js';
import { pluralCategory } from '../lib/plural.js';
import { findSaveWarnings } from '../lib/save-warnings.js';
import { renderSessionFile } from '../lib/session-file.js';
import { createSession } from '../lib/session.js';

const TEMPLATE_PATH = 'templates/session-file.html';
const FILE_EXTENSION = '.html';
// Language of the messages actually used, which may differ from the browser's
// when Keep Tabs is not translated into it.
const LANG = chrome.i18n.getMessage('languageCode') || 'en';

/**
 * Everything read when the popup opens, kept for the save.
 * @typedef {object} SaveContext
 * @property {chrome.windows.Window} window
 * @property {chrome.tabs.Tab[]} tabs
 * @property {chrome.tabGroups.TabGroup[]} groups
 * @property {string} template
 * @property {string} placeholderName
 */

const elements = {
	summary: byId('window-summary'),
	incognito: byId('incognito'),
	form: byId('save-form'),
	fileNameField: byId('file-name-field'),
	fileName: /** @type {HTMLInputElement} */ (byId('file-name')),
	lazyLoadingField: byId('lazy-loading-field'),
	lazyLoading: /** @type {HTMLInputElement} */ (byId('lazy-loading')),
	localFilesWarning: byId('local-files-warning'),
	localFilesText: byId('local-files-text'),
	openSettings: byId('open-settings'),
	unrestorableWarning: byId('unrestorable-warning'),
	unrestorableText: byId('unrestorable-text'),
	unrestorableList: byId('unrestorable-list'),
	saveButton: /** @type {HTMLButtonElement} */ (byId('save-button')),
	saved: byId('saved'),
	savedText: byId('saved-text'),
	notHtmlWarning: byId('not-html-warning'),
	closeWindow: byId('close-window'),
	error: byId('error'),
};

localizePage();
try {
	await start();
} catch (error) {
	showError(message('readFailed', [errorText(error)]), error);
}

async function start() {
	const currentWindow = await chrome.windows.getCurrent({ populate: true });
	if (currentWindow.incognito) {
		elements.incognito.hidden = false;
		return;
	}
	const windowId = currentWindow.id;
	if (windowId === undefined) {
		throw new Error('The current window has no ID');
	}
	const [groups, template, fileAccessAllowed] = await Promise.all([
		chrome.tabGroups.query({ windowId }),
		loadTemplate(),
		isFileAccessAllowed(),
	]);
	const tabs = currentWindow.tabs ?? [];
	const openedAt = new Date();

	/** @type {SaveContext} */
	const context = {
		window: currentWindow,
		tabs,
		groups,
		template,
		placeholderName: defaultFileName({
			tabCount: tabs.length,
			tabLabel: message(`fileNameTab_${pluralCategory(tabs.length, LANG)}`),
			date: openedAt,
		}),
	};

	elements.summary.textContent = pluralMessage('windowTabCount', tabs.length);
	elements.fileName.placeholder = context.placeholderName;
	// The warnings look at the same addresses as the saved file will.
	const preview = createSession({ ...captureOf(context), name: context.placeholderName, appVersion: '', createdAt: openedAt, lazyLoading: true });
	showWarnings(findSaveWarnings(preview.tabs, fileAccessAllowed));

	elements.openSettings.addEventListener('click', async () => {
		try {
			await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
		} catch (error) {
			showError(message('openSettingsFailed', [errorText(error)]), error);
		}
	});
	elements.closeWindow.addEventListener('click', async () => {
		try {
			// The popup closes with the window.
			await chrome.windows.remove(windowId);
		} catch (error) {
			showError(message('closeWindowFailed', [errorText(error)]), error);
		}
	});
	elements.form.addEventListener('submit', (event) => {
		event.preventDefault();
		save(context);
	});
	elements.form.hidden = false;
	elements.fileName.focus();
}

/**
 * @param {SaveContext} context
 */
async function save(context) {
	elements.error.hidden = true;
	elements.saveButton.disabled = true;
	try {
		// Nothing may be awaited before the dialog: it needs the click that
		// is still being handled.
		const handle = await window.showSaveFilePicker({
			suggestedName: toFileName(elements.fileName.value, context.placeholderName),
			startIn: 'desktop',
			types: [{ description: message('fileTypeDescription'), accept: { 'text/html': [FILE_EXTENSION] } }],
		});
		// The browser checks the file (Safe Browsing, antivirus) before it is
		// final, which can take a few seconds: show that the save is running.
		showSaving(true);
		await writeSessionFile(handle, context);
		elements.form.hidden = true;
		elements.savedText.textContent = message('savedMessage', [handle.name]);
		// The dialog lets the user type another extension.
		elements.notHtmlWarning.hidden = hasHtmlExtension(handle.name);
		elements.saved.hidden = false;
		elements.closeWindow.focus();
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			// The user closed the dialog without saving.
			return;
		}
		// The field must be visible again before it can take the focus back:
		// it was lost when the field was hidden.
		showSaving(false);
		showError(message('saveFailed', [errorText(error)]), error);
		elements.fileName.focus();
	} finally {
		showSaving(false);
		elements.saveButton.disabled = false;
	}
}

/**
 * While the file is written, the choices that no longer apply are hidden. They
 * come back only after an error: on success, the whole form is hidden.
 * @param {boolean} saving whether the file is being written
 */
function showSaving(saving) {
	elements.saveButton.textContent = message(saving ? 'savingButton' : 'saveButton');
	elements.form.setAttribute('aria-busy', String(saving));
	elements.fileNameField.hidden = saving;
	elements.lazyLoadingField.hidden = saving;
}

/**
 * @param {FileSystemFileHandle} handle
 * @param {SaveContext} context
 */
async function writeSessionFile(handle, context) {
	const savedAt = new Date();
	// The user may have renamed the file in the dialog: the session takes the
	// name actually chosen.
	const session = createSession({
		...captureOf(context),
		name: sessionNameOf(handle.name),
		appVersion: chrome.runtime.getManifest().version,
		createdAt: savedAt,
		lazyLoading: elements.lazyLoading.checked,
	});
	const date = new Intl.DateTimeFormat(LANG, { dateStyle: 'long', timeStyle: 'short' }).format(savedAt);
	const html = renderSessionFile({
		template: context.template,
		session,
		texts: {
			lang: LANG,
			summary: pluralMessage('sessionSummary', session.tabs.length, [date]),
			notInstalled: message('sessionNotInstalled'),
			restoring: message('sessionRestoring'),
			pinned: message('sessionPinned'),
		},
		extensionId: chrome.runtime.id,
	});
	const writable = await handle.createWritable();
	try {
		await writable.write(html);
		await writable.close();
	} catch (error) {
		// Without abort, the browser may leave a temporary ".crswap" file next
		// to the chosen one.
		await writable.abort().catch((abortError) => console.error('Keep Tabs: could not cancel the write', abortError));
		throw error;
	}
}

/**
 * @param {SaveContext} context
 */
function captureOf(context) {
	return { window: context.window, tabs: context.tabs, groups: context.groups };
}

/**
 * @param {import('../lib/save-warnings.js').SaveWarnings<{ url: string, title: string }>} warnings
 */
function showWarnings({ localFiles, unrestorable }) {
	if (localFiles.length > 0) {
		elements.localFilesText.textContent = pluralMessage('localFilesWarning', localFiles.length);
		elements.localFilesWarning.hidden = false;
	}
	if (unrestorable.length > 0) {
		elements.unrestorableText.textContent = pluralMessage('unrestorableWarning', unrestorable.length);
		elements.unrestorableList.replaceChildren(...unrestorable.map((tab) => {
			const item = document.createElement('li');
			item.textContent = tab.title || tab.url || message('untitledTab');
			return item;
		}));
		elements.unrestorableWarning.hidden = false;
	}
}

/**
 * @returns {Promise<string>}
 */
async function loadTemplate() {
	const response = await fetch(chrome.runtime.getURL(TEMPLATE_PATH));
	if (!response.ok) {
		throw new Error(`Cannot load ${TEMPLATE_PATH}: ${response.status}`);
	}
	return response.text();
}

/**
 * @returns {Promise<boolean>}
 */
function isFileAccessAllowed() {
	return new Promise((resolve) => chrome.extension.isAllowedFileSchemeAccess(resolve));
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
 * @param {string[]} [substitutions] the following ones
 * @returns {string}
 */
function pluralMessage(key, count, substitutions = []) {
	return message(`${key}_${pluralCategory(count, LANG)}`, [String(count), ...substitutions]);
}

/**
 * @param {string} text
 * @param {unknown} error
 */
function showError(text, error) {
	console.error('Keep Tabs:', error);
	elements.error.textContent = text;
	elements.error.hidden = false;
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
		throw new Error(`Missing element #${id} in popup.html`);
	}
	return element;
}
