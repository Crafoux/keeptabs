/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import manifest from '../src/manifest.json';

/** Paths of the files in src/, relative to it, as the manifest writes them. */
const files = Object.keys(import.meta.glob('../src/**/*')).map((path) => path.slice('../src/'.length));

// Sizes the browser and the Chrome Web Store look for.
const ICON_SIZES = ['16', '32', '48', '128'];
const ACTION_ICON_SIZES = ['16', '32'];

describe('manifest icons', () => {
	it('come in every size the browser uses', () => {
		expect(Object.keys(manifest.icons)).toEqual(ICON_SIZES);
		expect(Object.keys(manifest.action.default_icon)).toEqual(ACTION_ICON_SIZES);
	});

	// A missing icon is not an error for the browser: it silently shows a
	// grey letter instead.
	it('point to files that exist', () => {
		const paths = [...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
		for (const path of paths) {
			expect(files, path).toContain(path);
		}
	});
});
