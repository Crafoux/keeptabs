import { describe, expect, it } from 'vitest';
import { defaultFileName, hasHtmlExtension, sessionNameOf, toFileName } from '../../src/lib/file-name.js';

describe('defaultFileName', () => {
	it('combines the tab count, the translated label, the date and the time', () => {
		const date = new Date(2026, 10, 2, 14, 35, 8);
		expect(defaultFileName({ tabCount: 8, tabLabel: 'tabs', date })).toBe('KeepTabs_8-tabs_2026-11-02_14-35-08');
	});

	it('pads every date and time part to two digits', () => {
		const date = new Date(2026, 0, 5, 9, 4, 7);
		expect(defaultFileName({ tabCount: 1, tabLabel: 'onglet', date })).toBe('KeepTabs_1-onglet_2026-01-05_09-04-07');
	});
});

describe('toFileName', () => {
	const fallback = 'KeepTabs_8-tabs_2026-11-02_14-35-08';

	it('adds the .html extension', () => {
		expect(toFileName('Project X', fallback)).toBe('Project X.html');
	});

	it('does not add the extension twice, whatever its case', () => {
		expect(toFileName('Project X.HTML', fallback)).toBe('Project X.html');
	});

	it('uses the fallback when the field is empty or blank', () => {
		expect(toFileName('', fallback)).toBe(`${fallback}.html`);
		expect(toFileName('   ', fallback)).toBe(`${fallback}.html`);
	});

	it('replaces characters forbidden in file names', () => {
		expect(toFileName('Project: X/Y? <draft> "v2" a\\b*c|d', fallback)).toBe('Project_ X_Y_ _draft_ _v2_ a_b_c_d.html');
	});

	it('replaces control characters', () => {
		expect(toFileName('line\nbreak\ttab', fallback)).toBe('line_break_tab.html');
	});

	it('removes trailing dots and spaces', () => {
		expect(toFileName('Notes...  ', fallback)).toBe('Notes.html');
	});

	it('protects names reserved by Windows', () => {
		expect(toFileName('CON', fallback)).toBe('_CON.html');
		expect(toFileName('lpt1', fallback)).toBe('_lpt1.html');
	});

	it('protects reserved names followed by another extension', () => {
		expect(toFileName('con.backup', fallback)).toBe('_con.backup.html');
		expect(toFileName('NUL.tar', fallback)).toBe('_NUL.tar.html');
	});

	it('keeps names that only start like a reserved name', () => {
		expect(toFileName('console', fallback)).toBe('console.html');
		expect(toFileName('com10', fallback)).toBe('com10.html');
	});

	it('keeps accents and other letters', () => {
		expect(toFileName('Réunion été — 日本', fallback)).toBe('Réunion été — 日本.html');
	});

	it('limits very long names', () => {
		expect(toFileName('a'.repeat(500), fallback)).toBe(`${'a'.repeat(240)}.html`);
	});

	it('limits names in bytes, so that Linux and macOS accept them', () => {
		const name = toFileName('日'.repeat(300), fallback);
		expect(name).toBe(`${'日'.repeat(80)}.html`);
		expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(255);
	});

	it('never cuts a character in two', () => {
		expect(toFileName(`${'a'.repeat(238)}😀😀`, fallback)).toBe(`${'a'.repeat(238)}.html`);
		// A family emoji is one character made of several code points.
		expect(toFileName(`${'a'.repeat(230)}👨‍👩‍👧`, fallback)).toBe(`${'a'.repeat(230)}.html`);
	});

	it('uses the fallback when only forbidden trailing characters were typed', () => {
		expect(toFileName('...', fallback)).toBe(`${fallback}.html`);
	});
});

describe('hasHtmlExtension', () => {
	it.each(['Project X.html', 'Project X.HTML'])('accepts %s', (fileName) => {
		expect(hasHtmlExtension(fileName)).toBe(true);
	});

	it.each(['notes.txt', 'Project X.htm', 'html'])('rejects %s', (fileName) => {
		expect(hasHtmlExtension(fileName)).toBe(false);
	});
});

describe('sessionNameOf', () => {
	it('removes the .html extension, whatever its case', () => {
		expect(sessionNameOf('Project X.html')).toBe('Project X');
		expect(sessionNameOf('Project X.HTML')).toBe('Project X');
	});

	it('keeps any other extension', () => {
		expect(sessionNameOf('notes.txt')).toBe('notes.txt');
	});
});
