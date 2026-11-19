# Welcome page

Available since: v0.1.0 (in development).

Right after Keep Tabs is installed, it opens a welcome page in a new tab. It is
not shown again on updates of Keep Tabs or of the browser.

Code: `src/welcome/`, opened by `src/background/service-worker.js`.

## Content

1. **How it works**, in three steps: save a window with the Keep Tabs icon and
   the "Save as" dialog (the Desktop by default), close it, double-click the
   file to get it back. A tip explains how to pin the Keep Tabs icon to the
   toolbar, where the browser hides it at first.
2. **Tabs showing files from your computer**: the optional "Allow access to
   file URLs" setting, only needed to reopen tabs that show a local file. The
   page says whether it is on or off, and **Open the setting** opens the
   extension's details page. The state is read again whenever the page becomes
   visible, so it is up to date when the user comes back from the setting.
3. **Your tabs stay on your computer**: no account, no server, nothing is sent
   anywhere.

The page follows the language of the browser and its light or dark theme.

## Opening it again

During development, reloading an unpacked extension is an update, not an
install: the page does not open. It can be opened at
`chrome-extension://<extension ID>/welcome/welcome.html`.
