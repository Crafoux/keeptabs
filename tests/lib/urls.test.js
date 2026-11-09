import { describe, expect, it } from 'vitest';
import { isLocalFileUrl, isRestorableUrl } from '../../src/lib/urls.js';

describe('isRestorableUrl', () => {
	it.each([
		'https://example.com/',
		'http://example.org/page?query=1#anchor',
		'file:///C:/Users/someone/Documents/report.pdf',
		'chrome://settings/',
		'chrome-extension://abcdefghijklmnopabcdefghijklmnop/page.html',
		'edge://settings/',
		'brave://settings/',
		'about:blank',
	])('accepts %s', (url) => {
		expect(isRestorableUrl(url)).toBe(true);
	});

	it.each([
		'javascript:alert(1)',
		'JavaScript:alert(1)',
		'data:text/html,<p>hello</p>',
		'blob:https://example.com/0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
		'ftp://example.com/file.txt',
		'',
		'not a url',
	])('rejects %s', (url) => {
		expect(isRestorableUrl(url)).toBe(false);
	});
});

describe('isLocalFileUrl', () => {
	it('recognizes file URLs', () => {
		expect(isLocalFileUrl('file:///home/someone/notes.txt')).toBe(true);
	});

	it.each(['https://example.com/', 'chrome://settings/', '', 'not a url'])('rejects %s', (url) => {
		expect(isLocalFileUrl(url)).toBe(false);
	});
});
