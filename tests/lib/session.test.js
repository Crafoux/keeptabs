import { describe, expect, it } from 'vitest';
import { createSession, SESSION_FORMAT_VERSION } from '../../src/lib/session.js';

/**
 * @param {Partial<import('../../src/lib/session.js').CapturedTab>} overrides
 * @returns {import('../../src/lib/session.js').CapturedTab}
 */
function tab(overrides) {
	return { url: 'https://example.com/', title: 'Example', pinned: false, active: false, groupId: -1, ...overrides };
}

/**
 * @param {Partial<Parameters<typeof createSession>[0]>} overrides
 * @returns {Parameters<typeof createSession>[0]}
 */
function capture(overrides) {
	return {
		name: 'Project X',
		appVersion: '1.0.0',
		createdAt: new Date('2026-11-02T13:35:08Z'),
		lazyLoading: true,
		window: { state: 'normal', left: 232, top: 46, width: 1124, height: 812 },
		tabs: [tab({ active: true })],
		groups: [],
		...overrides,
	};
}

describe('createSession', () => {
	it('records the format version and the save details', () => {
		const session = createSession(capture({}));
		expect(session).toMatchObject({
			format: SESSION_FORMAT_VERSION,
			appVersion: '1.0.0',
			createdAt: '2026-11-02T13:35:08.000Z',
			name: 'Project X',
			lazyLoading: true,
		});
	});

	it('keeps the window position, size and state', () => {
		const session = createSession(capture({}));
		expect(session.window).toEqual({ state: 'normal', left: 232, top: 46, width: 1124, height: 812 });
	});

	it('keeps maximized and fullscreen states', () => {
		expect(createSession(capture({ window: { state: 'maximized' } })).window.state).toBe('maximized');
		expect(createSession(capture({ window: { state: 'fullscreen' } })).window.state).toBe('fullscreen');
	});

	it('saves minimized and unknown states as normal', () => {
		expect(createSession(capture({ window: { state: 'minimized' } })).window.state).toBe('normal');
		expect(createSession(capture({ window: { state: 'locked-fullscreen' } })).window.state).toBe('normal');
		expect(createSession(capture({ window: {} })).window.state).toBe('normal');
	});

	it('leaves out missing or invalid bounds', () => {
		const session = createSession(capture({ window: { state: 'normal', left: Number.NaN, width: 800 } }));
		expect(session.window).toEqual({ state: 'normal', width: 800 });
	});

	it('keeps tabs in window order with their pinned and active state', () => {
		const session = createSession(capture({
			tabs: [
				tab({ url: 'https://example.com/a', title: 'A', pinned: true }),
				tab({ url: 'https://example.com/b', title: 'B', active: true }),
				tab({ url: 'https://example.org/c', title: 'C' }),
			],
		}));
		expect(session.tabs).toEqual([
			{ url: 'https://example.com/a', title: 'A', pinned: true, active: false, group: null },
			{ url: 'https://example.com/b', title: 'B', pinned: false, active: true, group: null },
			{ url: 'https://example.org/c', title: 'C', pinned: false, active: false, group: null },
		]);
	});

	it('uses the pending URL of a tab that is still loading', () => {
		const session = createSession(capture({ tabs: [tab({ url: '', pendingUrl: 'https://example.org/next' })] }));
		expect(session.tabs[0].url).toBe('https://example.org/next');
	});

	it('saves an empty title rather than nothing', () => {
		const session = createSession(capture({ tabs: [tab({ title: undefined })] }));
		expect(session.tabs[0].title).toBe('');
	});

	it('numbers groups in the order they appear in the window, not by browser ID', () => {
		const session = createSession(capture({
			tabs: [
				tab({ groupId: 900 }),
				tab({ groupId: 900 }),
				tab({ groupId: 12 }),
				tab({}),
			],
			groups: [
				{ id: 12, title: 'Beta', color: 'red', collapsed: true },
				{ id: 900, title: 'Alpha', color: 'blue', collapsed: false },
			],
		}));
		expect(session.groups).toEqual([
			{ title: 'Alpha', color: 'blue', collapsed: false },
			{ title: 'Beta', color: 'red', collapsed: true },
		]);
		expect(session.tabs.map((saved) => saved.group)).toEqual([0, 0, 1, null]);
	});

	it('does not save groups that contain no tab', () => {
		const session = createSession(capture({ groups: [{ id: 5, title: 'Empty', color: 'green', collapsed: false }] }));
		expect(session.groups).toEqual([]);
	});

	it('treats a tab whose group is unknown as ungrouped', () => {
		const session = createSession(capture({ tabs: [tab({ groupId: 77 })] }));
		expect(session.tabs[0].group).toBeNull();
		expect(session.groups).toEqual([]);
	});

	it('replaces an unknown group color with grey and keeps unnamed groups', () => {
		const session = createSession(capture({
			tabs: [tab({ groupId: 3 })],
			groups: [{ id: 3, color: 'rainbow', collapsed: false }],
		}));
		expect(session.groups).toEqual([{ title: '', color: 'grey', collapsed: false }]);
	});
});
