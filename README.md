# hermes-eva-theme

An Evangelion (NERV / MAGI) skin for Hermes Desktop: a dual-pilot colour theme,
a launch boot sequence, and a MAGI HUD pane.

This is a port of the DeepSeek Harness plugin DSH EVA Theme by seaison —
https://github.com/seaison/dsh-plugin-eva-theme — with the host layer rewritten
for Hermes Desktop.

Repository: https://github.com/BrokenwingS83/hermes-eva-theme

Dark mode is Asuka (red), light mode is Rei (blue). The pilot reading follows
the app's own mode, so switching Appearance switches pilots.

## What it adds

| Piece | Where it appears |
|---|---|
| Theme `EVA` | Settings ▸ Appearance ▸ Theme, with both palettes |
| Skin | scanlines, Mincho headings, tabular numerals, EVA hairline strokes |
| Boot sequence | full-window overlay on a fresh launch: NERV card, alarm, pilot select, plug sync, doors, voice |
| MAGI pane | right-hand pane: clock, pilot, model, session, TPS, context, tokens, cost, billing band and countdown |
| Status chip | statusbar right: pilot dot and PEAK / OFF-PEAK |
| Settings page | Settings ▸ Plugins ▸ EVA |

Commands in the palette (⌘K): apply the theme, play the boot sequence now, toggle
the boot on launch, show the MAGI pane.

## Requirements

Hermes Desktop with the plugin SDK. The plugin uses `THEMES_AREA`,
`PANES_AREA`, `STATUSBAR_AREAS`, `ctx.registerSettingsPage`, `ctx.storage` and
`host.revealPane`; a build without `revealPane` or `registerSettingsPage` still
loads, and simply skips the pane reveal and the settings entry.

## Install

The plugin lives in one directory. Copy the artifact and your media into it:

    INSTALL="$HERMES_HOME/desktop-plugins/eva-theme"
    mkdir -p "$INSTALL"
    cp plugin/plugin.js "$INSTALL/"
    cp -R plugin/media "$INSTALL/"        # after a build, or supply your own

Then restart the app, or run ⌘K → "Reload desktop plugins".

Restart is not optional advice. Two behaviours make an in-place install invisible
otherwise:

- A plugin directory created while the app is running is not discovered at all.
- Hot reload of an existing directory is unreliable: it fired twice and then
  failed three times in a row with identical edits.

Uninstall: delete the directory and restart. Revert the theme from
Settings ▸ Appearance.

## Media is not in this repository

The artwork, voice clips and NERV animation carry third-party terms, so they are
gitignored (see NOTICE). Two ways to get them:

1. Build from the upstream checkout — the build copies them into `plugin/media/`:

       git clone https://github.com/seaison/dsh-plugin-eva-theme vendor/dsh-plugin-eva-theme
       node build/build.mjs

2. Drop your own files into `media-src/` under the exact names listed in
   `media-src/README.md`, then build.

Missing media does not break the plugin: the boot overlay records the failure in
its trace and continues, and the MAGI pane is unaffected.

## Build

    node build/build.mjs [upstream-checkout] [out-dir] [flags]

    --media-base <dir>   install path baked into the artifact (default:
                         $HERMES_HOME/desktop-plugins/eva-theme/media)
    --app-src <dir>      Hermes Desktop apps/desktop/src, for the SDK and CSS
                         checks (default: $HERMES_HOME/hermes-agent/apps/desktop/src)
    --check              rebuild into a temp dir and diff against the committed
                         artifacts; exit 1 on drift

`--check` needs the upstream checkout, because the palette and media are its
single source: `node build/build.mjs <upstream> --check`.

The build fails on purpose when any of these break:

- the parsed palette is not exactly 107 entries
- a WCAG AA text/background pair drops below 4.5 in either mode
- an SDK name the artifact imports is not exported by the host barrel
- a token is missing from the 107-row mapping table, or a target variable it
  names does not exist in the host stylesheet
- `--check` finds the committed `plugin/` or `docs/` differs from a fresh build

## Repository layout

    build/build.mjs           generator, the only thing that writes plugin.js
    src/body.js               plugin logic (theme, skin, boot, pane, settings)
    plugin/plugin.js          committed artifact — this is what gets installed
    plugin/eva-theme.theme.json  theme object alone, for diffing
    plugin/media/             copied assets (gitignored)
    docs/theme-tokens.md      generated: 107 upstream tokens and where each lands
    media-src/                your own assets (gitignored except its README)
    vendor/                   upstream checkout used as build input (gitignored)
    fit-report.md             feasibility assessment written before the port

`plugin.js`, `eva-theme.theme.json` and `docs/theme-tokens.md` are generated.
Edit `src/body.js` or `build/build.mjs` and rebuild; a hand edit to the artifact
is overwritten.

## Settings

Stored per plugin through `ctx.storage`:

| Key | Default | Effect |
|---|---|---|
| `bootEnabled` | true | play the boot overlay on a fresh launch |
| `soundEnabled` | true | pilot voice clips during the boot |
| `bootLanguage` | zh | boot copy in 中文 / 日本語 / EN |
| `scanline` | normal | CRT overlay strength: off / low / full |
| `clockScale` | 1 | MAGI clock type scale: 0.85 / 1 / 1.2 |

Settings ▸ Plugins ▸ EVA writes these and applies them live. The pane and the
status chip read the same keys.

## Install link

The desktop app accepts deep links of the form

    hermes://plugin/install?repo=<git-url-or-owner/repo>

which clones the repository, probes it as a plugin and asks for confirmation
before installing. Publishing this repo would make that link usable for one-step
install.

The repository is public, so

    hermes://plugin/install?repo=BrokenwingS83/hermes-eva-theme

is the intended one-step install. It has not been exercised end to end here: the
installer's parser and probe were read, but the flow was never run against a
remote. What is tested is the copy-and-restart sequence above. If the deep link
misbehaves, use that; a report of what it printed is welcome.

## Known limitations

- The media base is baked in at build time (`--media-base`) because the renderer
  resolves `import.meta.url` to `blob:file:///<uuid>`, so relative URLs cannot
  work. If you install somewhere other than
  `$HERMES_HOME/desktop-plugins/eva-theme/`, rebuild with `--media-base` or the
  media will not load.
- The MAGI pane is revealed once, on the first load after install, because a pane
  that docks into a collapsed side renders at 0×0 and the host never opens the
  zone on its own. After that the layout is yours; use ⌘K → "EVA: show the MAGI
  pane" to bring it back.
- Billing bands follow DeepSeek's published peak hours (Mon–Fri 01:00–04:00 and
  06:00–10:00 UTC). Chinese public holidays are not excluded, matching the
  agent's own pricing table, so a holiday shows PEAK while the bill is off-peak.
- TPS reads `host.state.focusedUsage.avg_tps` — the backend's rolling average.
  With no session it shows an em dash rather than a guess.
- The tail of the boot sequence and the pane's on-screen size were verified on
  an isolated instance over CDP, not in a production window (no debug port).

## Upstream project

DSH EVA Theme, by seaison — https://github.com/seaison/dsh-plugin-eva-theme

Ported at v0.51.2 (`f8b9638`). Nearly everything visible here comes from that
project: the 107-entry palette, the boot-sequence design and its copy, the
scanline and Mincho styling intent, and the asset filenames. What this port
replaced is the host layer — cordis selectors and DSH CSS modules have no Hermes
equivalent — and the now-playing player, the balance proxy and the track control,
which are dropped. NOTICE records what is derived, what is not distributed, and
under which terms.

## Licence

Code: MIT, see LICENSE. Upstream attribution and the media carve-out: see
NOTICE. Nothing in this repository grants rights to the Evangelion imagery or
the voice clips.
