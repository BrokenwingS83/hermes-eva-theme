# Can dsh-plugin-eva-theme be fitted into Hermes Desktop?

Assessment of github.com/seaison/dsh-plugin-eva-theme (v0.51.2, MIT code, third-party
EVA media) against the native Hermes Desktop app (`hermes desktop`).
Checked 2026-10-28 against the SDK source in `~/.hermes/hermes-agent/apps/desktop`.

Verdict: yes for the theme, palette and decoration layer; partially for the HUD
widgets; no for the DOM-level chrome patches as written. It is a port, not a
drop-in: the plugin targets DeepSeek Harness's cordis host API and DSH's CSS
module class names, neither of which exist in Hermes.

## What the project is

Two halves, as the repo ships them.

- `lib/index.js` (194 lines) is the host half: `apply(ctx)` with `ctx.inject([...])`
  scopes, static asset routes on the DSH `webServer`, a balance proxy reading a
  stored credential, and macOS now-playing / track control through
  `osascript` + a JXA script.
- `lib/client.js` (3466 lines) is the browser half: one module object with a
  107-entry `PALETTE` of `--dsw-alias-*` tokens, a `SKIN_CSS` stylesheet, and the
  boot sequence, clock, TPS waveform, music player, pilot selection and sound
  cues.
- `assets/` is 14 MB: 9.5 MB of audio (including a 9.4 MB background track),
  4.1 MB of character line-art PNGs, the NERV GIF, and SVGs.

## What Hermes Desktop exposes (verified in source)

- Disk plugins: one uncompiled ESM file at
  `$HERMES_HOME/desktop-plugins/<id>/plugin.js`, imports limited to
  `@hermes/plugin-sdk`, `react`, `react/jsx-runtime`. Hot reload on save.
- Themes: `THEMES_AREA` (`'themes'`) takes a `DesktopTheme` as `data`
  (`src/themes/user-themes.ts:132`), validated by `isValidTheme`
  (`src/themes/types.ts:123`) and listed in the Appearance picker like a built-in.
- A theme carries about 25 colour keys plus typography plus a `customCSS` string
  that `applyTheme` injects as one `<style id="hermes-desktop-custom-css">`
  tag on apply and removes on switch (`src/themes/context.tsx:421-440`).
- Everything visual derives from seeds: `applyTheme` writes `--theme-*`,
  `--dt-*` and `--ui-success` as inline style on `:root`
  (`src/themes/context.tsx:339-390`); `--ui-bg-*`, `--ui-text-*`,
  `--ui-stroke-*` are then computed in `src/styles.css:297-380` via
  `color-mix()`. Stylesheet-level overrides work for the derived layer, not for
  the inline seeds.
- Plugins run in the renderer with real DOM access. Injecting a `<style>` tag,
  `html[data-*]` attributes or a `MutationObserver` from a permanent mount is
  explicitly sanctioned; behaviour reach-in (clicking host buttons, rewriting
  host text) is against catalog rule 8 and is being migrated away from.
- Backend: a Python `plugin_api.py` mounted at `/api/plugins/<id>/`, reached
  through `ctx.rest` / `ctx.socket`; gated separately by `plugins.enabled` in
  `config.yaml`. `broadcast_plugin_event` pushes to `host.onEvent`.
- OS door: `ctx.os` is notify / openExternal / revealPath / clipboard only. No
  arbitrary shell.
- Events available for the sound cues: `approval.pending`, `approval.respond`,
  `approval.cancelled`, `message.complete`, plus `host.state.busy` and
  `host.state.focusedUsage`.

## Layer-by-layer fit

| Layer | Fits? | Why |
|---|---|---|
| Palette (107 tokens) | Yes | 25 of them map onto `DesktopThemeColors`; the rest are derived by the host from those seeds. |
| Typography (Mincho headings) | Yes | `typography` plus one `h1,h2,h3` rule in `customCSS`. |
| Decoration (scanlines, vignette, hairlines) | Yes | `customCSS`, scoped by the `data-hermes-theme` attribute the host already sets. |
| Character line-art / NERV GIF / audio | Yes, with a route | 14 MB cannot go in the module; needs a `plugin_api.py` static route (or trimming to the small SVGs). |
| Composer / sidebar / menu chrome patches | No, as written | 104 `querySelector` calls and CSS-module selectors like `class*="_placeholder"` against DSH markup. Hermes has `data-slot="composer-*"`, `data-chat-surface`, `data-conversation-scaffold` — different anchors, several with no equivalent. Rewrite or drop. |
| HUD widgets (clock, TPS, player, balance) | Yes, better | Contributed panes with `dock` beat DSH's absolute overlays; `host.state.focusedUsage` and `message.delta` feed TPS; clock is local. |
| Music now-playing / control | Yes, via backend | Requires osascript in the Python half; `ctx.os` cannot run it. macOS only, same as upstream. |
| Balance readout | Yes, via backend | The Python half can read the provider key from config; the renderer never sees it. |
| Boot sequence (GIF, alarm, pilot select, plug, doors) | Partially | It is a fixed full-window overlay plus audio, which the renderer can do. But the code is built around DSH's `#root` mounting, macOS drag regions and host-modal isolation; those parts are DSH-specific and need rewriting. Autoplay still needs a first gesture. |
| Settings panel | Rewrite, smaller | `ctx.registerSettingsPage` replaces the bespoke floating panel; `ctx.storage` replaces the localStorage namespace. |

## The palette proof

`build-eva-theme.js` parses the 107-entry `PALETTE` out of the DSH client,
maps 25 keys onto `DesktopThemeColors`, and emits a real Hermes disk plugin
(`out/plugin.js`) plus `out/eva-theme.theme.json`.

Verified:

- syntax: `node --check` passes on the emitted module
- every imported name exists in the SDK (`host` at `src/sdk/index.ts:670`,
  `PALETTE_AREA` 1706, `requestTheme` 2053, `THEMES_AREA` 2056)
- theme shape matches `isValidTheme`, so the host will list it
- WCAG AA on all seven text/background pairs in both modes: light/Rei worst pair
  4.70, dark/Asuka worst pair 5.27

## Installed state (2026-10-28)

The desktop app is now installed at `/Applications/Hermes.app` (commit 3a94a589,
same as the CLI), and the theme is live in it.

- `~/.hermes/desktop-plugins/eva-theme/plugin.js` is the installed plugin. Its
  content is byte-identical to `out/plugin.js`, which `build-eva-theme.js`
  regenerates — keep those two in step by re-running the generator and copying.
- The plugin loads and registers both contributions. Renderer beacons in
  localStorage: `hermes.plugin.eva-theme.loadCount` (3 at the time of writing),
  `themeName = "eva"`, and `autoApplied = true`.
- `requestTheme('eva')` returned true, which resolves the name through the same
  lookup the Appearance picker uses, so the contributed theme is live.
- The theme is the active one: `hermes-boot-background` (written by
  `applyTheme` on every apply) moved from `#fefefe` to `#eff6f9` — EVA's Rei
  background `#eff6fa` mixed 8% toward the light chrome constant.
- One-shot activation: the first load after install applies the theme and sets
  `autoApplied`, so a later pick in Appearance is never overridden again.

To revert: Settings -> Appearance, pick any other theme. To switch pilot: dark
mode is Asuka, light mode is Rei (the theme carries both palettes). The palette
command "EVA: apply theme" re-applies it from anywhere.

Intermediate failure worth recording: the first copy (11:20) loaded as
`no valid default HermesPlugin export` even though it parsed and exported
correctly; the regenerated file loaded cleanly two minutes later with no other
change to the export shape. The cause is unresolved; if a future edit trips the
same message, rewrite the file through the generator rather than patching it in
place.

## Effort, if you want the whole thing

| Piece | Estimate |
|---|---|
| Theme + decoration (spike above, finished) | half a day |
| HUD panes (clock, TPS, now-playing, balance shell) | 1-2 days |
| Python backend (assets route, osascript music, balance) | 1 day |
| Boot sequence port | 2-3 days |
| Composer/sidebar chrome patches | not recommended; the DSH selectors have no stable Hermes equivalent |

Licence note: the code is MIT, but the character art, voice clips and the
鷺巣詩郎 track carry their own terms (upstream NOTICE.md / docs/assets.md). A
public port should ship the code and let the user supply media.

## Recommendation

Build it as a Hermes plugin in three stages, in this order: theme plus
decoration (done as a spike), HUD panes, then the boot overlay behind a setting.
Skip the composer/sidebar literal patches — they are the part most likely to
break on every Hermes release, and the host already styles those surfaces from
the same seeds.
