import { GROUP_COLORS } from './session.js';

/** Page of Keep Tabs that receives the session, relative to the extension root. */
export const RECEIVER_PATH = 'content/receiver.html';

// Chromium extension IDs are 32 letters from "a" to "p".
const EXTENSION_ID = /^[a-p]{32}$/;
// Other schemes cannot be opened from a local page by a click.
const LINKABLE_SCHEMES = ['http:', 'https:', 'file:'];

/**
 * Translated texts written into the session file, in the language active
 * when it is saved.
 * @typedef {object} SessionFileTexts
 * @property {string} lang language code of the texts ("en", "fr")
 * @property {string} summary e.g. "8 tabs, saved on 2 November 2026 at 14:35"
 * @property {string} notInstalled shown when Keep Tabs does not answer
 * @property {string} restoring shown while Keep Tabs restores the window
 * @property {string} pinned label of pinned tabs
 */

/**
 * Fills the session file template. Every value coming from tabs is escaped:
 * page titles and URLs are untrusted.
 * @param {object} input
 * @param {string} input.template content of src/templates/session-file.html
 * @param {import('./session.js').Session} input.session
 * @param {SessionFileTexts} input.texts
 * @param {string} input.extensionId ID of the Keep Tabs install saving the file
 * @returns {string} the complete HTML document
 */
export function renderSessionFile({ template, session, texts, extensionId }) {
	if (!EXTENSION_ID.test(extensionId)) {
		throw new Error(`Invalid extension ID: ${extensionId}`);
	}
	/** @type {Record<string, string>} */
	const values = {
		lang: escapeHtml(texts.lang),
		format: String(session.format),
		name: escapeHtml(session.name),
		summary: escapeHtml(texts.summary),
		notInstalled: escapeHtml(texts.notInstalled),
		tabs: renderTabs(session, texts),
		sessionJson: toScriptJson(session),
		extensionIdJson: toScriptJson(extensionId),
		restoringJson: toScriptJson(texts.restoring),
		receiverPath: RECEIVER_PATH,
	};
	// A single pass: placeholders that appear inside inserted values (a page
	// titled "{{name}}") are left as they are.
	return template.replace(/{{(\w+)}}/g, (placeholder, key) => {
		if (!Object.hasOwn(values, key)) {
			throw new Error(`Unknown placeholder in the session file template: ${placeholder}`);
		}
		return values[key];
	});
}

/**
 * Lists the tabs in window order. Adjacent tabs of one group are shown together
 * under the name and color of the group, as in the browser. Tabs of one group
 * that are not adjacent (a file edited by hand) form separate blocks.
 * @param {import('./session.js').Session} session
 * @param {SessionFileTexts} texts
 * @returns {string} lines of HTML, indented for the template
 */
function renderTabs(session, texts) {
	/** @type {string[]} */
	const lines = [];
	/**
	 * @param {number} depth levels of indentation inside the list
	 * @param {string} html
	 */
	const add = (depth, html) => lines.push(`${'\t'.repeat(depth + 2)}${html}`);
	let index = 0;
	while (index < session.tabs.length) {
		const groupIndex = session.tabs[index].group;
		const group = groupIndex === null ? undefined : session.groups[groupIndex];
		if (!group) {
			add(0, renderTab(session.tabs[index], texts));
			index++;
			continue;
		}
		const color = GROUP_COLORS.includes(group.color) ? group.color : 'grey';
		// An unnamed group still shows its color.
		const title = group.title ? escapeHtml(group.title) : '&nbsp;';
		add(0, `<li class="group group-${color}">`);
		add(1, `<span class="group-title">${title}</span>`);
		add(1, '<ol>');
		while (index < session.tabs.length && session.tabs[index].group === groupIndex) {
			add(2, renderTab(session.tabs[index], texts));
			index++;
		}
		add(1, '</ol>');
		add(0, '</li>');
	}
	return lines.join('\n');
}

/**
 * @param {import('./session.js').SavedTab} tab
 * @param {SessionFileTexts} texts
 * @returns {string}
 */
function renderTab(tab, texts) {
	const badge = tab.pinned ? `<span class="badge">${escapeHtml(texts.pinned)}</span>` : '';
	const label = escapeHtml(tab.title || tab.url);
	const content = isLinkable(tab.url) ? `<a href="${escapeHtml(tab.url)}">${label}</a>` : `<span>${label}</span>`;
	return `<li class="tab">${badge}${content}</li>`;
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isLinkable(url) {
	try {
		return LINKABLE_SCHEMES.includes(new URL(url).protocol);
	} catch {
		return false;
	}
}

/**
 * Escapes text for HTML content and quoted attribute values.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/**
 * JSON that is safe inside a <script> element: escaping "<" means no value
 * can close the element ("</script>") or open a comment ("<!--").
 * @param {unknown} value
 * @returns {string}
 */
function toScriptJson(value) {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}
