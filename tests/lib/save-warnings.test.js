import { describe, expect, it } from 'vitest';
import { findSaveWarnings } from '../../src/lib/save-warnings.js';

const web = { url: 'https://example.com/', title: 'Example' };
const settings = { url: 'chrome://settings/', title: 'Settings' };
const localFile = { url: 'file:///C:/Users/someone/report.pdf', title: 'report.pdf' };
const blob = { url: 'blob:https://example.com/0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e', title: 'Preview' };
const data = { url: 'data:text/plain,hello', title: 'hello' };

describe('findSaveWarnings', () => {
	it('has nothing to say about regular tabs', () => {
		expect(findSaveWarnings([web, settings], false)).toEqual({ localFiles: [], unrestorable: [] });
	});

	it('lists local files when file URL access is off', () => {
		expect(findSaveWarnings([web, localFile], false).localFiles).toEqual([localFile]);
	});

	it('does not warn about local files when file URL access is on', () => {
		expect(findSaveWarnings([web, localFile], true).localFiles).toEqual([]);
	});

	it('lists tabs with temporary content, whatever the setting', () => {
		expect(findSaveWarnings([blob, web, data], true).unrestorable).toEqual([blob, data]);
		expect(findSaveWarnings([blob, web, data], false).unrestorable).toEqual([blob, data]);
	});

	it('treats a tab without address as unrestorable', () => {
		const empty = { url: '', title: '' };
		expect(findSaveWarnings([empty], true).unrestorable).toEqual([empty]);
	});
});
