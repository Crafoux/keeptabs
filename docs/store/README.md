# Store assets

What the Chrome Web Store listing and the extension show of Keep Tabs, and the
sources they are made from.

## Icon

A folder with a tab behind it and an arrow down: the tabs of the window are
put away, to be taken out later. White on the blue of the Keep Tabs buttons
(`#0b57d0`), so that it reads on light and dark toolbars alike.

| File | Source | Used for |
|---|---|---|
| `src/icons/icon-16.png`, `icon-32.png` | `icon-small.svg` | Toolbar button and extensions menu (32 px on high-density screens). |
| `src/icons/icon-48.png` | `icon.svg` | `chrome://extensions`. |
| `src/icons/icon-128.png` | `icon.svg` | Installation dialog and Chrome Web Store. |

`icon.svg` keeps a transparent margin of 16 px out of 128, as the Chrome Web
Store asks. At 16 and 32 px this margin would leave too few pixels for the
drawing, so `icon-small.svg` is the same drawing without the margin, with a
thicker arrow.

The PNG files are exported from the SVG files at their exact size, with a
transparent background. After changing a source, export every size again and
check the 16 px icon in the toolbar, on a light and a dark theme.
