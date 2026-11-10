/**
 * Picks the plural form of a message. `chrome.i18n` has no plural support, so
 * every plural message is a pair of keys suffixed `_one` and `_other`.
 *
 * Languages do not agree on what is singular: English says "0 tabs", French
 * says "0 onglet". Some languages have more categories ("many" for a million
 * in French): they fall back to `_other`.
 * @param {number} count
 * @param {string} lang language of the messages ("en", "fr")
 * @returns {'one' | 'other'}
 */
export function pluralCategory(count, lang) {
	return new Intl.PluralRules(lang).select(count) === 'one' ? 'one' : 'other';
}
