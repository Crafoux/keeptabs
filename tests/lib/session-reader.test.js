import { describe, expect, it } from 'vitest';
import { InvalidSessionError, readSession } from '../../src/lib/session-reader.js';
import { createSession, SESSION_FORMAT_VERSION } from '../../src/lib/session.js';

/**
 * @param {Record<string, unknown>} overrides
 * @returns {Record<string, unknown>}
 */
function sessionData(overrides) {
	return {
		format: 1,
		appVersion: '1.0.0',
		createdAt: '2026-11-02T13:35:08.000Z',
		name: 'Project X',
		lazyLoading: true,
		window: { state: 'normal', left: 232, top: 46, width: 1124, height: 812 },
		groups: [{ title: 'Alpha', color: 'blue', collapsed: false }],
		tabs: [
			{ url: 'https://example.com/', title: 'Example Domain', pinned: true, active: false, group: null },
			{ url: 'https://example.org/', title: 'Example', pinned: false, active: true, group: 0 },
		],
		...overrides,
	};
}

/**
 * @param {Record<string, unknown>} overrides
 */
function read(overrides) {
	return readSession(JSON.stringify(sessionData(overrides)));
}

/**
 * @param {string} text
 * @returns {InvalidSessionError}
 */
function rejection(text) {
	try {
		readSession(text);
	} catch (error) {
		if (error instanceof InvalidSessionError) {
			return error;
		}
		throw error;
	}
	throw new Error('The session was accepted');
}

describe('readSession', () => {
	it('reads back exactly what createSession saved', () => {
		const saved = createSession({
			name: 'Project X',
			appVersion: '1.0.0',
			createdAt: new Date('2026-11-02T13:35:08Z'),
			lazyLoading: false,
			window: { state: 'maximized', left: 0, top: 0, width: 1920, height: 1040 },
			tabs: [
				{ url: 'https://example.com/', title: 'A </script> title', pinned: true, active: false, groupId: -1 },
				{ url: 'https://example.org/', title: 'B', pinned: false, active: true, groupId: 4 },
			],
			groups: [{ id: 4, title: 'Alpha', color: 'cyan', collapsed: true }],
		});
		// As written in the file, with every "<" escaped.
		const text = JSON.stringify(saved).replace(/</g, '\\u003c');
		expect(readSession(text)).toEqual(saved);
	});

	describe('rejects a file it cannot use at all', () => {
		it.each([
			['text that is not JSON', 'not json'],
			['an empty text', ''],
			['a JSON value that is not an object', '[1, 2]'],
			['null', 'null'],
		])('%s', (_label, text) => {
			expect(rejection(text).reason).toBe('invalid');
		});

		it.each([
			['missing', undefined],
			['not a number', '1'],
			['not a whole number', 1.5],
			['zero', 0],
		])('a format version that is %s', (_label, format) => {
			expect(rejection(JSON.stringify(sessionData({ format }))).reason).toBe('invalid');
		});

		it('a file without a tab list', () => {
			expect(rejection(JSON.stringify(sessionData({ tabs: undefined }))).reason).toBe('invalid');
			expect(rejection(JSON.stringify(sessionData({ tabs: {} }))).reason).toBe('invalid');
		});

		it('a file saved by a newer Keep Tabs, with its own reason', () => {
			const error = rejection(JSON.stringify(sessionData({ format: SESSION_FORMAT_VERSION + 1 })));
			expect(error.reason).toBe('newerFormat');
			expect(error.message).toContain(String(SESSION_FORMAT_VERSION + 1));
		});
	});

	it('accepts a session without tabs: there is simply nothing to restore', () => {
		expect(read({ tabs: [] }).tabs).toEqual([]);
	});

	it('gives wrong details their default value', () => {
		const session = read({ appVersion: 2, createdAt: null, name: ['x'], lazyLoading: 'no' });
		expect(session).toMatchObject({ appVersion: '', createdAt: '', name: '', lazyLoading: true });
	});

	describe('window', () => {
		it('restores an unknown or missing state as normal', () => {
			expect(read({ window: { state: 'minimized' } }).window).toEqual({ state: 'normal' });
			expect(read({ window: 'big' }).window).toEqual({ state: 'normal' });
			expect(read({ window: undefined }).window).toEqual({ state: 'normal' });
		});

		it('drops bounds that are not numbers, and sizes that are not positive', () => {
			const session = read({ window: { state: 'fullscreen', left: '10', top: null, width: 0, height: -5 } });
			expect(session.window).toEqual({ state: 'fullscreen' });
		});

		it('keeps negative positions: a window may sit on a screen at the left', () => {
			expect(read({ window: { state: 'normal', left: -1920, top: -8 } }).window).toEqual({ state: 'normal', left: -1920, top: -8 });
		});

		it('rounds bounds to whole pixels', () => {
			expect(read({ window: { state: 'normal', left: 10.6, width: 800.4 } }).window).toEqual({ state: 'normal', left: 11, width: 800 });
		});
	});

	describe('groups', () => {
		it('repairs a wrong group without moving the others', () => {
			const session = read({
				groups: ['broken', { title: 3, color: 'rainbow', collapsed: 'yes' }, { title: 'Beta', color: 'red', collapsed: true }],
				tabs: [{ url: 'https://example.com/', group: 2 }],
			});
			expect(session.groups).toEqual([
				{ title: '', color: 'grey', collapsed: false },
				{ title: '', color: 'grey', collapsed: false },
				{ title: 'Beta', color: 'red', collapsed: true },
			]);
			expect(session.tabs[0].group).toBe(2);
		});

		it('treats a missing group list as empty', () => {
			expect(read({ groups: undefined }).groups).toEqual([]);
		});
	});

	describe('tabs', () => {
		it('keeps a tab without a valid address, with an empty one', () => {
			const session = read({ tabs: [{ title: 'Lost' }, { url: 42 }, 'broken'] });
			expect(session.tabs).toEqual([
				{ url: '', title: 'Lost', pinned: false, active: false, group: null },
				{ url: '', title: '', pinned: false, active: false, group: null },
				{ url: '', title: '', pinned: false, active: false, group: null },
			]);
		});

		it('only takes true as true', () => {
			const session = read({ tabs: [{ url: 'https://example.com/', pinned: 'true', active: 1 }] });
			expect(session.tabs[0]).toMatchObject({ pinned: false, active: false });
		});

		it.each([
			['beyond the group list', 1],
			['negative', -1],
			['not a whole number', 0.5],
			['not a number', '0'],
		])('makes a tab ungrouped when its group is %s', (_label, group) => {
			expect(read({ tabs: [{ url: 'https://example.com/', group }] }).tabs[0].group).toBeNull();
		});

		it('keeps the address as it is: deciding what may be opened is not its job', () => {
			expect(read({ tabs: [{ url: 'javascript:alert(1)' }] }).tabs[0].url).toBe('javascript:alert(1)');
		});
	});
});
