# Chrome Web Store listing

What to fill in the Chrome Web Store developer dashboard. Each text is in a
code block, to be copied as it is. When Keep Tabs changes, the matching text is
updated here, in the same commit.

The French texts contain non-breaking spaces before `:`, `;`, `!` and `?`, as
in `src/_locales/fr/messages.json`: keep them when editing.

## Package

### Name and summary

Not filled in the dashboard: they come from the manifest, through
`extensionName` and `extensionDescription` in `src/_locales/<lang>/messages.json`.
The store shows the language of the user.

## Store listing

| Field | Value |
|---|---|
| Category | Productivity, then the closest subcategory (Workflow & Planning, or Tools). |
| Language | English, with a French translation of the description. |
| Store icon | `src/icons/icon-128.png` |
| Homepage URL | `https://github.com/Crafoux/keeptabs` |
| Support URL | `https://github.com/Crafoux/keeptabs/issues` |
| Mature content | No |

### Description (English)

```text
Keep Tabs saves all the tabs of a window to a file, so that you can close the window and get it back later, exactly as you left it, with a double-click on the file.

Too many windows open, each one a project on hold? Turn each one into a file and keep it wherever you want: on the Desktop, in a project folder, next to your documents.

HOW IT WORKS
1. Click the Keep Tabs icon in the window you want to keep.
2. Choose a name and a folder for the file (the Desktop by default).
3. Close the window. When you need it again, double-click the file: Keep Tabs opens the window again.

WHAT IS RESTORED
• Every tab, in the same order
• Pinned tabs
• Tab groups, with their name, color and collapsed state
• The selected tab
• The size and position of the window, or its maximized or fullscreen state

Only the selected tab loads right away; the others load when you click them, so that even a large window opens quickly. You can turn this off when saving.

A FILE THAT STAYS READABLE
The session file is a simple web page. Opened in a browser without Keep Tabs, it shows the saved tabs as links, grouped as they were in the window: your tabs are never lost.

PRIVATE BY DESIGN
• No account, no server, no tracking
• Keep Tabs makes no network request: your tabs are only written to the files you choose
• Free and open-source software (GNU GPL v3): https://github.com/Crafoux/keeptabs

GOOD TO KNOW
• Tabs showing a file from your computer (file://) reopen only when "Allow access to file URLs" is turned on in the details of the extension. Keep Tabs tells you when it matters.
• Private (incognito) windows cannot be saved.
• Available in English and French.
```

### Description (French)

```text
Keep Tabs enregistre tous les onglets d'une fenêtre dans un fichier : vous pouvez fermer la fenêtre, puis la retrouver plus tard telle que vous l'aviez laissée, d'un double-clic sur le fichier.

Trop de fenêtres ouvertes, chacune un projet en attente ? Faites de chacune un fichier, et rangez-le où vous voulez : sur le Bureau, dans le dossier d'un projet, à côté de vos documents.

COMMENT ÇA MARCHE
1. Cliquez sur l'icône de Keep Tabs dans la fenêtre à garder.
2. Choisissez un nom et un dossier pour le fichier (le Bureau par défaut).
3. Fermez la fenêtre. Quand vous en avez de nouveau besoin, double-cliquez sur le fichier : Keep Tabs rouvre la fenêtre.

CE QUI EST RESTAURÉ
• Tous les onglets, dans le même ordre
• Les onglets épinglés
• Les groupes d'onglets, avec leur nom, leur couleur et leur état réduit
• L'onglet sélectionné
• La taille et la position de la fenêtre, ou son état agrandi ou plein écran

Seul l'onglet sélectionné se charge tout de suite ; les autres se chargent quand vous cliquez dessus, pour que même une grande fenêtre s'ouvre vite. Vous pouvez désactiver ce comportement au moment d'enregistrer.

UN FICHIER QUI RESTE LISIBLE
Le fichier de session est une simple page web. Ouvert dans un navigateur sans Keep Tabs, il affiche les onglets enregistrés sous forme de liens, regroupés comme dans la fenêtre : vos onglets ne sont jamais perdus.

CONFIDENTIEL PAR CONCEPTION
• Pas de compte, pas de serveur, aucun pistage
• Keep Tabs ne fait aucune requête réseau : vos onglets sont seulement écrits dans les fichiers que vous choisissez
• Logiciel libre et open source (GNU GPL v3) : https://github.com/Crafoux/keeptabs

BON À SAVOIR
• Les onglets qui affichent un fichier de votre ordinateur (file://) ne se rouvrent que si « Autoriser l'accès aux URL de fichier » est activé dans les détails de l'extension. Keep Tabs vous le signale quand c'est utile.
• Les fenêtres de navigation privée ne peuvent pas être enregistrées.
• Disponible en français et en anglais.
```

### Images

| Field | Size | File |
|---|---|---|
| Screenshots (1 to 5) | 1280×800 | To do. |
| Small promo tile | 440×280 | To do. |
| Marquee promo tile | 1400×560 | Not planned (optional). |

## Privacy practices

### Single purpose

```text
Keep Tabs saves the tabs of a browser window to a file chosen by the user, and recreates that window when the user opens the file.
```

### Permission justifications

See [docs/technical/permissions.md](../technical/permissions.md) for the
details.

`tabs`:

```text
Keep Tabs reads the address and title of each tab of the window the user chooses to save, to write them to the session file. Without this permission, the browser hides them from extensions. When restoring, it reads the tabs it has just created, to wait until each one knows its address before putting it to sleep (lazy loading). Nothing is sent anywhere.
```

`tabGroups`:

```text
Keep Tabs reads the tab groups of the saved window (name, color, collapsed) to write them to the session file, and recreates them when the window is restored.
```

### Remote code

No, I am not using remote code.

### Data usage

Keep Tabs reads the addresses and titles of the tabs of the saved window, and
writes them to a file on the user's computer. Nothing is sent anywhere, but the
Chrome Web Store asks to declare data that is only handled on the device too.

| Data type | Declared | Why |
|---|---|---|
| Web history | Yes | Addresses and titles of the tabs of the saved window. |
| Every other type | No | Keep Tabs reads no page content, form data, location, credentials or activity. |

Certify the three statements: the data is not sold to third parties, not used
or transferred for purposes unrelated to the single purpose, and not used to
determine creditworthiness or for lending.

### Privacy policy URL

```text
https://github.com/Crafoux/keeptabs/blob/main/PRIVACY.md
```
