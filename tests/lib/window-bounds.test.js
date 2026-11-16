import { describe, expect, it } from 'vitest';
import { boundsToTry } from '../../src/lib/window-bounds.js';

describe('boundsToTry', () => {
	it('tries the saved bounds, then the size alone, then none', () => {
		expect(boundsToTry({ left: 3000, top: 100, width: 800, height: 600 })).toEqual([
			{ left: 3000, top: 100, width: 800, height: 600 },
			{ width: 800, height: 600 },
			{},
		]);
	});

	it('drops the whole position, even when only one coordinate was saved', () => {
		expect(boundsToTry({ left: -5000, width: 800 })).toEqual([{ left: -5000, width: 800 }, { width: 800 }, {}]);
	});

	it('goes straight to no bounds when only a position was saved', () => {
		expect(boundsToTry({ left: 3000, top: 100 })).toEqual([{ left: 3000, top: 100 }, {}]);
	});

	it('goes straight to no bounds when only a size was saved', () => {
		expect(boundsToTry({ width: 800, height: 600 })).toEqual([{ width: 800, height: 600 }, {}]);
	});

	it('tries once, without bounds, when none were saved', () => {
		expect(boundsToTry({})).toEqual([{}]);
	});

	it('does not change the bounds it is given', () => {
		const bounds = { left: 1, top: 2, width: 3, height: 4 };
		const attempts = boundsToTry(bounds);
		attempts[0].left = 100;
		expect(bounds).toEqual({ left: 1, top: 2, width: 3, height: 4 });
	});
});
