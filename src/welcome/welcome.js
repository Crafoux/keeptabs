// Language of the messages actually used, which may differ from the browser's
// when Keep Tabs is not translated into it.
const LANG = chrome.i18n.getMessage('languageCode') || 'en';

const elements = {
	fileAccess: byId('file-access'),
	openSettings: byId('open-settings'),
	error: byId('error'),
};

localizePage();
elements.openSettings.addEventListener('click', openSettings);
// The user may change the setting in another tab, then come back here.
document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') {
		showFileAccess();
	}
});
showFileAccess();

async function showFileAccess() {
	try {
		const allowed = await isFileAccessAllowed();
		elements.fileAccess.textContent = message(allowed ? 'welcomeFilesOn' : 'welcomeFilesOff');
		elements.fileAccess.classList.toggle('on', allowed);
	} catch (error) {
		console.error('Keep Tabs: could not read the file URL access setting.', error);
		elements.fileAccess.textContent = '';
	}
}

async function openSettings() {
	elements.error.hidden = true;
	try {
		await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
	} catch (error) {
		console.error('Keep Tabs:', error);
		elements.error.textContent = message('openSettingsFailed', [error instanceof Error ? error.message : String(error)]);
		elements.error.hidden = false;
	}
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
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
	const element = document.getElementById(id);
	if (!element) {
		throw new Error(`Missing element #${id} in welcome.html`);
	}
	return element;
}
