# Restore a window

Available since: v0.1.0 (in development).

The user double-clicks a session file. It opens in the default browser, and
Keep Tabs recreates the saved window. The file itself is never modified or
deleted: it can be restored again as many times as needed.

Code: `src/content/` (receiver page), `src/background/` (restore) and the
loader script of `src/templates/session-file.html`.

## How the file reaches Keep Tabs

1. The session file loads a hidden frame showing the receiver page of
   Keep Tabs, `content/receiver.html`. Only local files can load it.
2. The receiver page answers that Keep Tabs is there. The file then shows
   "Restoring the window…" and sends its data to the frame, in a message.
3. The receiver page hands the data to the background service worker, which
   only accepts it from that page.

Without Keep Tabs, nothing answers and the file stays a list of links. See
[the session file format](../technical/session-file-format.md#hand-over-to-keep-tabs).

## What is restored

The data is checked first, then turned into a plan: see
[Reading a session file](../technical/session-file-format.md#reading-a-session-file)
and [Planning the restore](../technical/session-file-format.md#planning-the-restore).
Then Keep Tabs:

1. creates a new window, focused, at the saved position and size;
2. switches it to its saved state (maximized, fullscreen);
3. opens the tabs one by one, in order, pinned ones first;
4. recreates the tab groups with their name and color;
5. selects the saved tab, then collapses the groups that were collapsed;
6. with lazy loading on, puts every other tab to sleep (below).

The new window starts with a blank page, closed once the tabs are open: this
way a tab the browser refuses to open cannot prevent the window from being
created.

### Window outside the screens

The browser refuses to create a window that has less than half of its area on
a visible screen, for example a window saved on a monitor that has been
disconnected since. Keep Tabs then creates it again with the saved size alone,
then with no position or size: the browser places it on the current screen.
The saved state still applies. See the technical decision in
[docs/roadmap/v1.md](../roadmap/v1.md#4-window-outside-the-screens).

### Lazy loading

When the file was saved with **Load tabs only when I open them** on, every tab
but the selected one is put to sleep, after the window is complete: putting a
tab to sleep changes its browser ID. Each tab first waits until it knows its
address and title, for 8 seconds at most.

- A tab put to sleep before its address is known would lose it: such a tab is
  left loaded instead.
- A tab whose title is still unknown after 8 seconds is put to sleep anyway,
  and shows its address as title.
- A tab the user selects meanwhile is left loaded.

## Once the window is restored

- **Every tab reopened:** the tab of the session file is closed. If it was
  alone in its window, that window closes too, so only the restored window
  remains.
- **Some tabs not reopened:** the tab of the session file stays open. In place
  of its status message, it shows how many tabs are missing, lists them by
  title, with the reason:
  - their content was temporary, or Keep Tabs does not open this kind of
    address (see `src/lib/urls.js`);
  - they show a local file and "Allow access to file URLs" is off. **Open the
    setting** then opens the extension's details page;
  - the browser refused to open them.
- **No tab reopened:** no window is created, and the file lists the tabs the
  same way.

This report is written in the language of the browser, which may differ from
the language of the file.

## Errors

- **The file cannot be read** (not a Keep Tabs session, or damaged): the file
  says so and nothing is restored.
- **The file was saved by a newer Keep Tabs:** the file asks the user to update
  Keep Tabs.
- **The window cannot be created:** the file shows the error of the browser.
- A step the restore can do without (a group, the selected tab, the window
  state, a tab put to sleep) is logged in the console of the service worker,
  and the restore goes on.

## Known limitations

- Chrome keeps closed tab groups itself ("saved tab groups"): each restore
  creates new groups, so they may appear more than once.
- Reloading the tab of the session file restores the window again. This also
  happens when the tab stayed open after an incomplete restore and the browser
  reopens it at startup.
