# Session file format

A session file is what Keep Tabs writes when the user saves a window. This
page describes format version **1**.

Code: `src/lib/session.js` (data), `src/lib/session-file.js` (HTML) and
`src/templates/session-file.html` (template).

## Principles

- **One self-contained HTML file.** It loads no external resource: opening it
  makes no network request.
- **Readable without Keep Tabs.** It shows the session name, a summary and the
  list of tabs as links.
- **Restorable with Keep Tabs.** It embeds the saved data as JSON and hands it
  to the extension.
- **Written in the language of the save.** All visible text comes from the
  locale active when the file was saved.

## Structure of the HTML

| Element | Content |
|---|---|
| `<html lang>` | Language of the visible text (`en`, `fr`). |
| `<meta name="keeptabs-format">` | Format version, `1`. |
| `<title>`, `<h1>` | Session name. |
| `<p class="summary">` | Number of tabs and date of the save. |
| `<p id="keeptabs-status">` | Message for users without Keep Tabs; replaced while restoring. |
| `<ol>` | One item per tab, in order, with "pinned" and group badges. |
| `<script type="application/json" id="keeptabs-session">` | The session data (below). |
| `<script>` | The loader that hands the data to Keep Tabs (below). |

Only `http:`, `https:` and `file:` tabs are shown as links: other schemes
cannot be opened by a click from a local page, and `javascript:` must never be
clickable.

## Session data

```json
{
	"format": 1,
	"appVersion": "1.0.0",
	"createdAt": "2026-11-02T13:35:08.000Z",
	"name": "Project X",
	"lazyLoading": true,
	"window": { "state": "normal", "left": 232, "top": 46, "width": 1124, "height": 812 },
	"groups": [
		{ "title": "Alpha", "color": "blue", "collapsed": false }
	],
	"tabs": [
		{ "url": "https://example.com/", "title": "Example Domain", "pinned": true, "active": false, "group": null },
		{ "url": "https://example.org/", "title": "Example", "pinned": false, "active": true, "group": 0 }
	]
}
```

| Field | Type | Meaning |
|---|---|---|
| `format` | number | Format version. |
| `appVersion` | string | Version of Keep Tabs that saved the file. |
| `createdAt` | string | Date and time of the save, ISO 8601, UTC. |
| `name` | string | Session name: the file name without `.html`. |
| `lazyLoading` | boolean | Whether non-active tabs are restored without loading. |
| `window.state` | string | `normal`, `maximized` or `fullscreen`. A minimized window is saved as `normal`. |
| `window.left`, `top`, `width`, `height` | number | Position and size in pixels. Each one may be missing. |
| `groups[]` | array | Tab groups, in the order they appear in the window. |
| `groups[].title` | string | Group name, possibly empty. |
| `groups[].color` | string | `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan` or `orange`. |
| `groups[].collapsed` | boolean | Whether the group is collapsed. |
| `tabs[]` | array | Tabs, in window order. |
| `tabs[].url` | string | Address of the tab. |
| `tabs[].title` | string | Title of the tab, possibly empty. |
| `tabs[].pinned` | boolean | Whether the tab is pinned. |
| `tabs[].active` | boolean | Whether it is the selected tab of the window. |
| `tabs[].group` | number or null | Index of its group in `groups`, or `null`. |

Browser IDs of windows, tabs and groups are not saved: they mean nothing once
the window is closed.

## Escaping

Page titles and URLs come from websites and are untrusted.

- In the visible HTML, `& < > " '` are escaped.
- In the JSON and in the loader script, every `<` is written as `\u003c`, so no
  value can end the `<script>` element or open a comment. `JSON.parse` returns
  the exact original strings.
- Template placeholders are filled in a single pass: text that looks like a
  placeholder inside a page title is left as it is.

## Hand-over to Keep Tabs

The loader script:

1. adds a hidden frame showing `chrome-extension://<id>/content/receiver.html`,
   where `<id>` is the ID of the Keep Tabs install that saved the file;
2. waits for a `{ "type": "keeptabs-ready" }` message from that origin;
3. replaces the status text with the "restoring" message, and posts
   `{ "type": "keeptabs-session", "session": "<JSON text>" }` to the frame.

The data travels in a message, never in an address, so it never reaches the
browser history. The receiver page is the only page of Keep Tabs that can be
loaded from outside, and only by `file://` pages. Without Keep Tabs, nothing
answers and the page stays a list of links. See the technical decisions in
[docs/roadmap/v1.md](../roadmap/v1.md#technical-decisions).

## Reading a session file

Code: `src/lib/session-reader.js`.

A session file is untrusted: anyone can write one, or edit it by hand. Before
restoring, Keep Tabs checks the data it received.

The file is **rejected** when its structure cannot be used:

- the data is not a JSON object;
- `format` is missing or is not a whole number of at least 1;
- `tabs` is not an array.

A `format` higher than the one this version of Keep Tabs knows is rejected with
its own reason: the user is told to update Keep Tabs.

Smaller problems are **repaired**, so that as much as possible is restored:

| Problem | Repair |
|---|---|
| A text field that is not a string | Empty string. |
| `lazyLoading` that is not a boolean | `true`, the default of the save form. |
| An unknown window state | `normal`. |
| A position that is not a number | Left out. Positions are rounded to whole pixels. |
| A width or height that is not a positive number | Left out. |
| A group that is not an object, or an unknown color | Kept at its position, with the missing values replaced: no title, `grey`, not collapsed. |
| `pinned`, `active` or `collapsed` other than `true` | `false`. |
| A `group` that is not the index of a group | The tab is ungrouped. |
| A tab without a string `url` | Kept with an empty address, so it is listed among the tabs that could not be reopened. |

Which addresses may be opened is decided afterwards, when the restore is
planned: see `src/lib/urls.js`.

## Compatibility

Keep Tabs must keep reading every past format version. A change that older
versions could not read requires a new `format` number and an entry on this
page.
