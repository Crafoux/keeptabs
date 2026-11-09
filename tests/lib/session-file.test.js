/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import template from '../../src/templates/session-file.html?raw';
import { escapeHtml, RECEIVER_PATH, renderSessionFile } from '../../src/lib/session-file.js';
import { createSession } from '../../src/lib/session.js';

const EXTENSION_ID = 'abcdefghijklmnopabcdefghijklmnop';

/** @type {import('../../src/lib/session-file.js').SessionFileTexts} */
const TEXTS = {
	lang: 'en',
	summary: '3 tabs, saved on 2 November 2026 at 14:35',
	notInstalled: 'Install Keep Tabs to restore this window automatically.',
	restoring: 'Restoring the window…',
	pinned: 'Pinned',
};

/**
 * @param {Partial<import('../../src/lib/session.js').CapturedTab>[]} tabs
 * @param {import('../../src/lib/session.js').CapturedGroup[]} [groups]
 */
function sessionWith(tabs, groups = []) {
	return createSession({
		name: 'Project X',
		appVersion: '1.0.0',
		createdAt: new Date('2026-11-02T13:35:08Z'),
		lazyLoading: true,
		window: { state: 'normal' },
		tabs: tabs.map((overrides) => ({ url: 'https://example.com/', title: 'Example', pinned: false, active: false, groupId: -1, ...overrides })),
		groups,
	});
}

/**
 * @param {string} html
 * @returns {unknown}
 */
function embeddedSession(html) {
	const match = html.match(/<script type="application\/json" id="keeptabs-session">([\s\S]*?)<\/script>/);
	if (!match) {
		throw new Error('No embedded session');
	}
	return JSON.parse(match[1]);
}

describe('renderSessionFile', () => {
	const session = sessionWith(
		[
			{ url: 'https://example.com/', title: 'Example Domain', pinned: true },
			{ url: 'https://example.org/docs', title: 'Docs', active: true, groupId: 4 },
			{ url: 'chrome://settings/', title: 'Settings' },
		],
		[{ id: 4, title: 'Alpha', color: 'blue', collapsed: false }],
	);
	const html = renderSessionFile({ template, session, texts: TEXTS, extensionId: EXTENSION_ID });

	it('fills every placeholder', () => {
		expect(html).not.toMatch(/{{\w+}}/);
	});

	it('embeds the session data unchanged', () => {
		expect(embeddedSession(html)).toEqual(session);
	});

	it('writes the texts in the language of the save', () => {
		expect(html).toContain('<html lang="en">');
		expect(html).toContain(TEXTS.summary);
		expect(html).toContain(TEXTS.notInstalled);
		expect(html).toContain(JSON.stringify(TEXTS.restoring));
	});

	it('records the format version', () => {
		expect(html).toContain('<meta name="keeptabs-format" content="1">');
	});

	it('lists the tabs in order, with pinned and group badges', () => {
		const items = html.match(/<li>.*<\/li>/g);
		expect(items).toEqual([
			'<li><span class="badge badge-pinned">Pinned</span><a href="https://example.com/">Example Domain</a></li>',
			'<li><span class="badge group-blue">Alpha</span><a href="https://example.org/docs">Docs</a></li>',
			'<li><span>Settings</span></li>',
		]);
	});

	it('points the hidden frame to the Keep Tabs install that saved the file', () => {
		expect(html).toContain(`'chrome-extension://' + "${EXTENSION_ID}"`);
		expect(html).toContain(`'/${RECEIVER_PATH}'`);
	});

	// Links to the tabs are fine: they load nothing until clicked.
	it('makes no network request: no external resource is loaded', () => {
		expect(html).not.toMatch(/\ssrc=/);
		expect(html).not.toMatch(/<link\b/);
		expect(html).not.toMatch(/@import|url\(/);
	});
});

describe('renderSessionFile with hostile tab data', () => {
	const hostileTitle = '</script><script>alert(1)</script><!--';
	const session = sessionWith([
		{ url: 'https://example.com/?q="><img src=x onerror=alert(1)>', title: hostileTitle, groupId: 1 },
		{ url: 'javascript:alert(1)', title: 'Click me' },
		{ url: 'https://example.com/', title: '{{name}} {{sessionJson}}' },
	], [{ id: 1, title: '<b>group</b>', color: 'red', collapsed: false }]);
	const html = renderSessionFile({
		template,
		session: { ...session, name: '<Project "X">' },
		texts: TEXTS,
		extensionId: EXTENSION_ID,
	});

	it('cannot close or inject scripts', () => {
		expect(html).not.toContain('<script>alert(1)');
		expect(html).not.toContain('<img src=x');
		expect(html.match(/<script/g)).toHaveLength(2);
	});

	it('still embeds the exact original data', () => {
		expect(embeddedSession(html)).toMatchObject({ tabs: [{ title: hostileTitle }, {}, {}] });
	});

	it('escapes the session name, titles and group names', () => {
		expect(html).toContain('<title>&lt;Project &quot;X&quot;&gt;</title>');
		expect(html).toContain('&lt;b&gt;group&lt;/b&gt;');
	});

	it('never turns a javascript: URL into a link', () => {
		expect(html).not.toContain('href="javascript:');
		expect(html).toContain('<li><span>Click me</span></li>');
	});

	it('does not fill placeholders written inside tab titles', () => {
		expect(html).toContain('{{name}} {{sessionJson}}');
	});
});

describe('renderSessionFile errors', () => {
	const session = sessionWith([{}]);

	it('refuses an invalid extension ID', () => {
		expect(() => renderSessionFile({ template, session, texts: TEXTS, extensionId: 'bad"id' })).toThrow('Invalid extension ID');
	});

	it('refuses a template with an unknown placeholder', () => {
		expect(() => renderSessionFile({ template: '{{unknown}}', session, texts: TEXTS, extensionId: EXTENSION_ID }))
			.toThrow('Unknown placeholder');
	});
});

describe('escapeHtml', () => {
	it('escapes the five HTML special characters', () => {
		expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
	});
});
