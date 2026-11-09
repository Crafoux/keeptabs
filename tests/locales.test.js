/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import manifest from '../src/manifest.json';

/**
 * @typedef {object} Message
 * @property {string} message
 * @property {string} [description]
 * @property {Record<string, { content: string }>} [placeholders]
 */

/** @type {Record<string, Record<string, Message>>} */
const files = import.meta.glob('../src/_locales/*/messages.json', { eager: true, import: 'default' });

/** @type {Map<string, Record<string, Message>>} language code → messages */
const locales = new Map(
	Object.entries(files).map(([path, messages]) => [path.split('/').at(-2) ?? path, messages]),
);
const defaultMessages = locales.get(manifest.default_locale) ?? {};

// Chrome Web Store limits.
const MAX_NAME_LENGTH = 75;
const MAX_DESCRIPTION_LENGTH = 132;

// Naming rules of AGENTS.md: camelCase, plurals suffixed _one and _other.
const KEY_NAME = /^[a-z][a-zA-Z0-9]*(_one|_other)?$/;
const PLURAL_KEY = /^(\w+)_(one|other)$/;

describe('locales', () => {
	it('include English and French', () => {
		expect([...locales.keys()].sort()).toEqual(['en', 'fr']);
	});

	it('use English as the default locale', () => {
		expect(manifest.default_locale).toBe('en');
	});

	// Every locale has the same keys (checked below), so checking the names of
	// the default locale's keys is enough.
	it('name their keys in camelCase, with an optional plural suffix', () => {
		for (const key of Object.keys(defaultMessages)) {
			expect(key).toMatch(KEY_NAME);
		}
	});

	// chrome.i18n has no plural support: plurals are a pair of keys.
	it('define both forms of every plural key', () => {
		const keys = Object.keys(defaultMessages);
		for (const key of keys) {
			const plural = key.match(PLURAL_KEY);
			if (plural) {
				const otherForm = `${plural[1]}_${plural[2] === 'one' ? 'other' : 'one'}`;
				expect(keys, key).toContain(otherForm);
			}
		}
	});

	for (const [lang, messages] of locales) {
		describe(lang, () => {
			it('has exactly the same keys as the default locale', () => {
				expect(Object.keys(messages).sort()).toEqual(Object.keys(defaultMessages).sort());
			});

			it('gives every key a message and a description for translators', () => {
				for (const [key, entry] of Object.entries(messages)) {
					expect(entry.message, key).toBeTruthy();
					expect(entry.description, key).toBeTruthy();
				}
			});

			it('uses the same placeholders as the default locale', () => {
				for (const [key, entry] of Object.entries(messages)) {
					const expected = Object.keys(defaultMessages[key]?.placeholders ?? {}).sort();
					expect(Object.keys(entry.placeholders ?? {}).sort(), key).toEqual(expected);
				}
			});

			it('respects the store length limits', () => {
				expect(messages.extensionName.message.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
				expect(messages.extensionDescription.message.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
			});
		});
	}
});

describe('manifest', () => {
	it('only refers to messages that exist', () => {
		const keys = JSON.stringify(manifest).match(/__MSG_(\w+)__/g) ?? [];
		expect(keys.length).toBeGreaterThan(0);
		for (const key of keys) {
			expect(defaultMessages, key).toHaveProperty(key.slice('__MSG_'.length, -'__'.length));
		}
	});
});
