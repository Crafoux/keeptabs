# Permissions

Keep Tabs asks for as little as possible. Every permission in
`src/manifest.json` is listed here with the reason it is needed: the Chrome Web
Store asks for these justifications, and users deserve them.

A permission is added in the same commit as the feature that needs it, and this
page is updated in that commit.

## Current permissions

| Permission | Needed for | Since | Warning shown at install |
|---|---|---|---|
| `tabs` | Reading the address and title of each tab of the window being saved. Without it, the browser hides them from extensions. | v0.1.0 | "Read your browsing history" |
| `tabGroups` | Reading the tab groups (name, color, collapsed) when saving, and recreating them when restoring. | v0.1.0 | "View and manage your tab groups" |

Keep Tabs reads tabs **only** in two cases: when the user clicks Save, it reads
the tabs of the current window; when it restores a session, it reads the tabs
it has just created, to check that each one knows its address before putting it
to sleep. Nothing is sent anywhere: the data is written to the file the user
chooses.

## What Keep Tabs does not ask for

| Not requested | Why |
|---|---|
| Host permissions (access to websites) | Keep Tabs never reads or changes page content. |
| `downloads` | The file is written with the "Save as" dialog of the File System Access API, which needs no permission. |
| `history`, `cookies` | Keep Tabs never reads the browsing history or website cookies. |
| `storage` | Not needed so far: no data is kept inside the extension. If a restore must survive the browser stopping the background service worker, `storage` (no install warning) will be added with that feature and justified here. |
| Network access | Keep Tabs makes no network request at all. |

## Exposed resources

`web_accessible_resources` is not a permission, but it decides which pages of
Keep Tabs other pages can load. v1 will expose a single page,
`content/receiver.html`, and only to local files (`file:///*`): it receives the
data of a session file being restored. Websites cannot load it, so they can
neither detect Keep Tabs nor send it data.

## Optional user setting

**Allow access to file URLs** (in the extension's details) is off by default
for store installs. Keep Tabs works without it. The user only needs to turn it
on to reopen tabs that show a local file (`file://`); Keep Tabs explains this
when it matters.
