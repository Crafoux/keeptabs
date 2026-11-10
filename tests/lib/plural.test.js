import { describe, expect, it } from 'vitest';
import { pluralCategory } from '../../src/lib/plural.js';

describe('pluralCategory', () => {
	it.each([
		[0, 'other'],
		[1, 'one'],
		[2, 'other'],
		[8, 'other'],
	])('English: %i → %s', (count, expected) => {
		expect(pluralCategory(count, 'en')).toBe(expected);
	});

	it.each([
		[0, 'one'],
		[1, 'one'],
		[2, 'other'],
		[8, 'other'],
	])('French: %i → %s', (count, expected) => {
		expect(pluralCategory(count, 'fr')).toBe(expected);
	});

	it('falls back to "other" for categories without their own message', () => {
		// French uses the "many" category for a million.
		expect(new Intl.PluralRules('fr').select(1_000_000)).toBe('many');
		expect(pluralCategory(1_000_000, 'fr')).toBe('other');
	});
});
