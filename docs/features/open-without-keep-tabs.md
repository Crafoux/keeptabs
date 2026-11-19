# Open a session file without Keep Tabs

Available since: v0.1.0 (in development).

A session file is a regular web page. Opened in a browser where Keep Tabs is
not installed, or in any other browser, it shows what was saved, so the tabs
are never lost.

Code: `src/lib/session-file.js` and `src/templates/session-file.html`.

## What the page shows

- The **session name**, as title of the page and of its tab.
- A **summary**: the number of tabs and the date and time of the save.
- A **message** saying that installing Keep Tabs and opening the file again
  reopens the tabs automatically, in a window identical to the saved one.
- The **list of tabs**, in window order and numbered:
  - pinned tabs carry a "Pinned" badge;
  - adjacent tabs of one tab group are shown together, under the name of the
    group on its color, with a line of that color along them, as in the
    browser. An unnamed group shows its color only. The tabs of a group that
    was collapsed are shown too: the page is there to get them back;
  - each tab shows its title, or its address when it has none.

Only `http:`, `https:` and `file:` tabs are links: a local page cannot open
other addresses by a click (`chrome://…`), and `javascript:` addresses must
never be clickable. Clicking a link opens that one tab.

The page follows the light or dark theme of the system. Its texts are in the
language of the save. It loads nothing from the network: the links load their
page only when clicked.

## When Keep Tabs is installed

The same page hands its data to Keep Tabs, which restores the window: see
[Restore a window](restore-window.md). If Keep Tabs is installed but the file
was saved by another install of Keep Tabs (another extension ID, for example a
development build), the page behaves as if Keep Tabs were not installed.
