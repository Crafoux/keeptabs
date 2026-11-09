const FILE_EXTENSION = '.html';
// Linux and macOS limit a file name to 255 bytes, not characters. The margin
// leaves room for the extension, a "_" before a reserved name and the " (2)"
// a save dialog may add.
const MAX_BASE_BYTES = 240;
const UTF8 = new TextEncoder();
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

// Forbidden on Windows (the strictest system), plus control characters.
const FORBIDDEN_CHARACTERS = /[/\\:*?"<>|\u0000-\u001f\u007f]/g;
// Windows refuses these names, whatever their extension: "con.backup.html"
// is refused just like "con.html".
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

/**
 * @param {number} value
 * @returns {string}
 */
function twoDigits(value) {
	return String(value).padStart(2, '0');
}

/**
 * The name proposed when the user leaves the file name field empty, without
 * extension: `KeepTabs_8-tabs_2026-11-02_14-35-08`.
 * @param {object} details
 * @param {number} details.tabCount
 * @param {string} details.tabLabel translated word agreeing with the count ("tab", "tabs", "onglets"…)
 * @param {Date} details.date local date and time of the save
 * @returns {string}
 */
export function defaultFileName({ tabCount, tabLabel, date }) {
	const day = [date.getFullYear(), twoDigits(date.getMonth() + 1), twoDigits(date.getDate())].join('-');
	// "-" instead of ":", which Windows forbids in file names.
	const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(twoDigits).join('-');
	return `KeepTabs_${tabCount}-${tabLabel}_${day}_${time}`;
}

/**
 * Turns what the user typed into a file name every operating system accepts,
 * ending in `.html`.
 * @param {string} name what the user typed, possibly empty
 * @param {string} fallback name used when nothing usable is left, e.g. {@link defaultFileName}
 * @returns {string}
 */
export function toFileName(name, fallback) {
	const base = sanitize(stripExtension(name)) || sanitize(stripExtension(fallback)) || 'KeepTabs';
	return `${base}${FILE_EXTENSION}`;
}

/**
 * @param {string} name
 * @returns {string}
 */
function stripExtension(name) {
	const trimmed = name.trim();
	return trimmed.toLowerCase().endsWith(FILE_EXTENSION) ? trimmed.slice(0, -FILE_EXTENSION.length) : trimmed;
}

/**
 * @param {string} name
 * @returns {string}
 */
function sanitize(name) {
	// Windows also refuses names ending with a dot or a space.
	const cleaned = name
		.replace(FORBIDDEN_CHARACTERS, '_');
	const shortened = truncateToBytes(cleaned, MAX_BASE_BYTES)
		.replace(/[. ]+$/, '')
		.trim();
	return RESERVED_NAMES.test(shortened) ? `_${shortened}` : shortened;
}

/**
 * Keeps the start of a text that fits in a number of UTF-8 bytes, without
 * cutting a character in two: a lone half of an emoji is not a valid name.
 * @param {string} text
 * @param {number} maxBytes
 * @returns {string}
 */
function truncateToBytes(text, maxBytes) {
	let result = '';
	let bytes = 0;
	for (const { segment } of GRAPHEMES.segment(text)) {
		bytes += UTF8.encode(segment).length;
		if (bytes > maxBytes) {
			break;
		}
		result += segment;
	}
	return result;
}
