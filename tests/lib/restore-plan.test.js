import { describe, expect, it } from 'vitest';
import { planRestore } from '../../src/lib/restore-plan.js';

/**
 * @param {Partial<import('../../src/lib/session.js').SavedTab>} overrides
 * @returns {import('../../src/lib/session.js').SavedTab}
 */
function tab(overrides) {
	return { url: 'https://example.com/', title: 'Example', pinned: false, active: false, group: null, ...overrides };
}

/**
 * @param {Partial<import('../../src/lib/session.js').Session>} overrides
 * @returns {import('../../src/lib/session.js').Session}
 */
function session(overrides) {
	return {
		format: 1,
		appVersion: '1.0.0',
		createdAt: '2026-11-02T13:35:08.000Z',
		name: 'Project X',
		lazyLoading: true,
		window: { state: 'normal', left: 232, top: 46, width: 1124, height: 812 },
		groups: [],
		tabs: [tab({ active: true })],
		...overrides,
	};
}

const ALLOWED = { fileAccessAllowed: true };
const LOCAL_FILE = 'file:///C:/Users/someone/report.pdf';

describe('planRestore', () => {
	it('keeps the window and the lazy loading choice', () => {
		const plan = planRestore(session({ lazyLoading: false, window: { state: 'maximized', width: 900 } }), ALLOWED);
		expect(plan.window).toEqual({ state: 'maximized', width: 900 });
		expect(plan.lazyLoading).toBe(false);
	});

	it('opens a regular window exactly as saved', () => {
		const plan = planRestore(session({
			groups: [{ title: 'Alpha', color: 'blue', collapsed: true }],
			tabs: [
				tab({ url: 'https://example.com/pinned', pinned: true }),
				tab({ url: 'https://example.com/a', group: 0 }),
				tab({ url: 'https://example.com/b', group: 0 }),
				tab({ url: 'chrome://settings/', active: true }),
			],
		}), ALLOWED);
		expect(plan.tabs).toEqual([
			{ url: 'https://example.com/pinned', pinned: true, group: null },
			{ url: 'https://example.com/a', pinned: false, group: 0 },
			{ url: 'https://example.com/b', pinned: false, group: 0 },
			{ url: 'chrome://settings/', pinned: false, group: null },
		]);
		expect(plan.groups).toEqual([{ title: 'Alpha', color: 'blue', collapsed: true }]);
		expect(plan.activeIndex).toBe(3);
		expect(plan.skipped).toEqual([]);
	});

	describe('skipped tabs', () => {
		it('never opens an address that is not allowed', () => {
			const plan = planRestore(session({
				tabs: [
					tab({ url: 'javascript:alert(1)', title: 'Trap' }),
					tab({ url: 'data:text/html,hello', title: 'Data' }),
					tab({ url: '', title: 'Lost' }),
					tab({ active: true }),
				],
			}), ALLOWED);
			expect(plan.tabs.map((planned) => planned.url)).toEqual(['https://example.com/']);
			expect(plan.skipped).toEqual([
				{ url: 'javascript:alert(1)', title: 'Trap', reason: 'unrestorable' },
				{ url: 'data:text/html,hello', title: 'Data', reason: 'unrestorable' },
				{ url: '', title: 'Lost', reason: 'unrestorable' },
			]);
		});

		it('skips local files when file URL access is off', () => {
			const plan = planRestore(session({ tabs: [tab({ url: LOCAL_FILE, title: 'report.pdf' }), tab({ active: true })] }), { fileAccessAllowed: false });
			expect(plan.tabs).toHaveLength(1);
			expect(plan.skipped).toEqual([{ url: LOCAL_FILE, title: 'report.pdf', reason: 'localFile' }]);
		});

		it('opens local files when file URL access is on', () => {
			const plan = planRestore(session({ tabs: [tab({ url: LOCAL_FILE })] }), ALLOWED);
			expect(plan.tabs.map((planned) => planned.url)).toEqual([LOCAL_FILE]);
			expect(plan.skipped).toEqual([]);
		});

		it('plans nothing when no tab can be opened', () => {
			const plan = planRestore(session({ tabs: [tab({ url: 'blob:https://example.com/0b1c', active: true })] }), ALLOWED);
			expect(plan.tabs).toEqual([]);
			expect(plan.groups).toEqual([]);
			expect(plan.activeIndex).toBe(-1);
			expect(plan.skipped).toHaveLength(1);
		});

		it('plans nothing for a session without tabs', () => {
			const plan = planRestore(session({ tabs: [] }), ALLOWED);
			expect(plan).toMatchObject({ tabs: [], groups: [], activeIndex: -1, skipped: [] });
		});
	});

	describe('selected tab', () => {
		it('selects the next tab opened when the selected one is skipped', () => {
			const plan = planRestore(session({
				tabs: [
					tab({ url: 'https://example.com/a' }),
					tab({ url: 'data:text/plain,x', active: true }),
					tab({ url: 'https://example.com/b' }),
				],
			}), ALLOWED);
			expect(plan.tabs[plan.activeIndex].url).toBe('https://example.com/b');
		});

		it('selects the last tab opened when nothing follows the skipped one', () => {
			const plan = planRestore(session({
				tabs: [tab({ url: 'https://example.com/a' }), tab({ url: 'https://example.com/b' }), tab({ url: 'data:text/plain,x', active: true })],
			}), ALLOWED);
			expect(plan.tabs[plan.activeIndex].url).toBe('https://example.com/b');
		});

		it('selects the first tab when none is marked as selected', () => {
			const plan = planRestore(session({ tabs: [tab({ url: 'https://example.com/a' }), tab({ url: 'https://example.com/b' })] }), ALLOWED);
			expect(plan.activeIndex).toBe(0);
		});

		it('selects the first of several tabs marked as selected', () => {
			const plan = planRestore(session({
				tabs: [tab({ url: 'https://example.com/a' }), tab({ url: 'https://example.com/b', active: true }), tab({ url: 'https://example.com/c', active: true })],
			}), ALLOWED);
			expect(plan.activeIndex).toBe(1);
		});

		it('expands the group of the selected tab', () => {
			const plan = planRestore(session({
				groups: [{ title: 'Alpha', color: 'blue', collapsed: true }, { title: 'Beta', color: 'red', collapsed: true }],
				tabs: [tab({ group: 0, active: true }), tab({ group: 1 })],
			}), ALLOWED);
			expect(plan.groups.map((group) => group.collapsed)).toEqual([false, true]);
		});
	});

	describe('rules of the browser, for files edited by hand', () => {
		it('puts pinned tabs first, keeping the order of the others', () => {
			const plan = planRestore(session({
				tabs: [
					tab({ url: 'https://example.com/a' }),
					tab({ url: 'https://example.com/pinned-1', pinned: true }),
					tab({ url: 'https://example.com/b', active: true }),
					tab({ url: 'https://example.com/pinned-2', pinned: true }),
				],
			}), ALLOWED);
			expect(plan.tabs.map((planned) => planned.url)).toEqual([
				'https://example.com/pinned-1',
				'https://example.com/pinned-2',
				'https://example.com/a',
				'https://example.com/b',
			]);
			expect(plan.activeIndex).toBe(3);
		});

		it('never puts a pinned tab in a group', () => {
			const plan = planRestore(session({
				groups: [{ title: 'Alpha', color: 'blue', collapsed: false }],
				tabs: [tab({ pinned: true, group: 0 })],
			}), ALLOWED);
			expect(plan.tabs[0].group).toBeNull();
			expect(plan.groups).toEqual([]);
		});

		it('splits a group whose tabs are not adjacent, keeping the tab order', () => {
			const plan = planRestore(session({
				groups: [{ title: 'Alpha', color: 'blue', collapsed: false }],
				tabs: [tab({ group: 0 }), tab({}), tab({ group: 0 })],
			}), ALLOWED);
			expect(plan.tabs.map((planned) => planned.group)).toEqual([0, null, 1]);
			expect(plan.groups).toEqual([
				{ title: 'Alpha', color: 'blue', collapsed: false },
				{ title: 'Alpha', color: 'blue', collapsed: false },
			]);
		});

		it('splits two saved groups that follow each other', () => {
			const plan = planRestore(session({
				groups: [{ title: 'Alpha', color: 'blue', collapsed: false }, { title: 'Beta', color: 'red', collapsed: false }],
				tabs: [tab({ group: 0 }), tab({ group: 1 }), tab({ group: 1 })],
			}), ALLOWED);
			expect(plan.tabs.map((planned) => planned.group)).toEqual([0, 1, 1]);
			expect(plan.groups.map((group) => group.title)).toEqual(['Alpha', 'Beta']);
		});

		it('does not split a group around a skipped tab', () => {
			const plan = planRestore(session({
				groups: [{ title: 'Alpha', color: 'blue', collapsed: false }],
				tabs: [tab({ group: 0 }), tab({ url: 'data:text/plain,x', group: 0 }), tab({ group: 0 })],
			}), ALLOWED);
			expect(plan.tabs.map((planned) => planned.group)).toEqual([0, 0]);
			expect(plan.groups).toHaveLength(1);
		});

		it('leaves out groups whose tabs are all skipped', () => {
			const plan = planRestore(session({
				groups: [{ title: 'Alpha', color: 'blue', collapsed: false }, { title: 'Beta', color: 'red', collapsed: false }],
				tabs: [tab({ url: 'data:text/plain,x', group: 0 }), tab({ group: 1 })],
			}), ALLOWED);
			expect(plan.groups.map((group) => group.title)).toEqual(['Beta']);
			expect(plan.tabs[0].group).toBe(0);
		});
	});

	it('does not change the session it was given', () => {
		const original = session({
			groups: [{ title: 'Alpha', color: 'blue', collapsed: true }],
			tabs: [tab({ group: 0, active: true })],
		});
		const copy = structuredClone(original);
		const plan = planRestore(original, ALLOWED);
		plan.window.width = 1;
		expect(original).toEqual(copy);
	});
});
