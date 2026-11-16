import { describe, expect, it } from 'vitest';
import { discardDecision } from '../../src/lib/lazy-loading.js';

const URL = 'https://example.com/';

describe('discardDecision', () => {
	describe('before the waiting time is over', () => {
		it('waits while the address is not committed', () => {
			expect(discardDecision({ url: '', pendingUrl: URL, status: 'loading' }, false)).toBe('wait');
		});

		it('waits while a new address is still pending', () => {
			expect(discardDecision({ url: 'about:blank', pendingUrl: URL, title: 'Example', status: 'loading' }, false)).toBe('wait');
		});

		it('waits for the title once the address is known', () => {
			expect(discardDecision({ url: URL, status: 'loading', title: '' }, false)).toBe('wait');
			expect(discardDecision({ url: URL, status: 'loading', title: URL }, false)).toBe('wait');
		});

		it('discards once the address and the title are known', () => {
			expect(discardDecision({ url: URL, status: 'loading', title: 'Example Domain' }, false)).toBe('discard');
		});

		it('discards a page that finished loading, even without a title', () => {
			expect(discardDecision({ url: URL, status: 'complete', title: URL }, false)).toBe('discard');
		});
	});

	it('keeps loaded a tab the user selected meanwhile', () => {
		expect(discardDecision({ url: URL, status: 'complete', title: 'Example Domain', active: true }, false)).toBe('keepLoaded');
		expect(discardDecision({ url: URL, status: 'complete', title: 'Example Domain', active: true }, true)).toBe('keepLoaded');
	});

	describe('once the waiting time is over', () => {
		it('keeps loaded a tab whose address is still unknown, so the address is not lost', () => {
			expect(discardDecision({ url: '', pendingUrl: URL, status: 'loading' }, true)).toBe('keepLoaded');
			expect(discardDecision({}, true)).toBe('keepLoaded');
		});

		it('discards a tab whose address is known, even without a title', () => {
			expect(discardDecision({ url: URL, status: 'loading', title: '' }, true)).toBe('discard');
		});
	});
});
