# Save a window

Available since: v0.1.0 (in development).

The user clicks the Keep Tabs icon in the toolbar of the window they want to
save. The popup shows the number of tabs of that window and a form.

Code: `src/popup/`.

## The form

| Element | Behavior |
|---|---|
| **File name** | Empty. Its placeholder shows the default name, e.g. `KeepTabs_8-tabs_2026-11-02_14-35-08`, used when the field is left empty. The word "tabs" is translated and agrees with the count. Forbidden characters are replaced and `.html` is added (see `src/lib/file-name.js`). |
| **Load tabs only when I open them** | On by default. Stored in the file: when restoring, only the tab that was active loads right away. |
| **Save** | Opens the system "Save as" dialog, starting in the Desktop folder. The user can choose any folder and change the name. |

Pressing Enter in the file name field also saves.

## After saving

Once a name is chosen, the button reads **Saving…** while the file is written.
The browser checks the file (Safe Browsing, and the antivirus on Windows)
before it is final, which can take a few seconds.

The popup confirms the name of the written file and offers **Close this
window**. The session takes the name finally chosen in the dialog.

If the name typed in the dialog does not end in `.html`, the confirmation warns
that a double-click may not open the file in the browser.

Closing the dialog without saving leaves the form as it was. If the file cannot
be written, the popup shows the error, cancels the partial write and the form
stays available. If **Close this window** or **Open the setting** fails, the
popup shows the error too.

## Warnings

Shown before saving, only when they apply:

- **Local files.** When "Allow access to file URLs" is off and tabs show files
  from the computer (`file://`): they are saved, but will only reopen
  automatically once the setting is on. **Open the setting** opens the
  extension's details page.
- **Tabs that cannot be reopened.** Tabs whose address is not one Keep Tabs
  reopens (see `src/lib/urls.js`): mostly temporary content (`blob:`,
  `data:`), but also addresses such as `view-source:`. They are listed by
  title, or by address when they have no title: they are saved in the list of
  the file, but never reopened.

## Private windows

In an incognito window, the popup only says that private windows cannot be
saved. Keep Tabs runs there only if the user allowed it in incognito.

## What is written

The window's position, size and state, its tab groups and its tabs in order,
in a self-contained HTML file. See
[the session file format](../technical/session-file-format.md).

The texts of the file (summary, messages) are written in the language of the
popup.
