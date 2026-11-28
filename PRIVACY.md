# Privacy policy

Last updated: November 27, 2026

Keep Tabs is a browser extension that saves the tabs of a window to a file on
your computer and restores them from that file. This page explains what data it
handles, and what it does not do.

**In short:** Keep Tabs has no account, no server and no tracking. It never
sends anything over the network. Your tabs are only written to the files you
choose to save.

## What Keep Tabs reads

When you click the Keep Tabs icon, Keep Tabs reads the window it was clicked
in, to show its number of tabs and the warnings that apply. When you click
**Save**, it writes what it read to the file:

- the address and title of each tab, whether it is pinned and which one is
  selected;
- its tab groups: name, color and whether they are collapsed;
- the position, size and state (normal, maximized, fullscreen) of the window.

It reads nothing else: not your browsing history, not the content of the pages,
not your cookies, passwords or form data. It reads no other window, and
nothing at all until you click its icon.

When you open a session file, Keep Tabs reads the data stored in that file to
recreate the window.

## Where that data goes

Only into the session file, written where you choose in the "Save as" dialog
(the Desktop by default). Keep Tabs keeps no copy: it stores nothing inside the
browser, and forgets the data once the file is written or the window restored.

Keep Tabs makes no network request. It has no analytics, no advertising, no
crash reporting and no remote code. No data is sold, shared with or sent to
anyone, including the authors of Keep Tabs.

## Your session files

A session file contains the addresses and titles of your tabs, as readable text.
It is yours: you decide where to keep it, who to give it to and when to delete
it. Anyone who gets a copy can read the list of tabs, as with a bookmarks file.

The file loads nothing from the network when it is opened. The pages it lists
are only loaded when Keep Tabs restores the window, or when you click one of
its links: those websites then receive your visit as usual.

## Permissions

Keep Tabs asks for the browser permissions it needs to read and recreate a
window, and nothing more. Each one is explained in
[docs/technical/permissions.md](docs/technical/permissions.md).

## Changes to this policy

Any change to this policy is made in this file, whose history is public on
[GitHub](https://github.com/Crafoux/keeptabs/commits/main/PRIVACY.md). A
change that would let data leave your computer would be announced in the
release notes first.

## Contact

Questions about privacy can be asked in the
[issues of the project](https://github.com/Crafoux/keeptabs/issues).
