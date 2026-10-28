/**
 * Build the Hermes-native EVA plugin from the upstream DSH plugin.
 *
 *   node build/build.mjs [upstream-checkout] [out-dir] [flags]
 *
 *   --media-base <dir>   install path baked into the artifact as the file://
 *                        fallback (default: $HERMES_HOME/desktop-plugins/
 *                        eva-theme/media, i.e. where it will be installed)
 *   --app-src <dir>      Hermes Desktop `apps/desktop/src` (default:
 *                        $HERMES_HOME/hermes-agent/apps/desktop/src)
 *   --check              rebuild into a temp dir and diff against the
 *                        committed plugin/ and docs/; exit 1 on drift
 *
 * Single source of truth: the 107-entry PALETTE and the media live in the
 * upstream checkout; the logic lives in src/body.js; this script stitches them
 * into one installable plugin and copies the media the plugin references.
 *
 * Output:
 *   plugin/plugin.js               the committed artifact (copy to install dir)
 *   plugin/eva-theme.theme.json    the theme object alone (diffable)
 *   plugin/media/...               assets referenced by file:// (NOT committed)
 *   docs/theme-tokens.md           the 107-token mapping table
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname))
const HERMES_HOME = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes')

const argv = process.argv.slice(2)
const takeFlag = name => {
  const index = argv.indexOf(name)
  if (index < 0) return null
  const value = argv[index + 1]
  argv.splice(index, 2)
  return value
}
const CHECK = argv.includes('--check')
if (CHECK) argv.splice(argv.indexOf('--check'), 1)
const mediaBaseArg = takeFlag('--media-base')
const APP_SRC = path.resolve(takeFlag('--app-src') || path.join(HERMES_HOME, 'hermes-agent/apps/desktop/src'))

const INSTALL_MEDIA = path.join(HERMES_HOME, 'desktop-plugins/eva-theme/media')
const COMMITTED_PLUGIN = path.join(ROOT, 'plugin/plugin.js')
const COMMITTED_DOC = path.join(ROOT, 'docs/theme-tokens.md')

/** In --check mode the rebuild has to use the same baked media base as the
 *  committed artifact, or every run reports a false diff. */
const bakedMediaBase = () => {
  try {
    const artifact = fs.readFileSync(COMMITTED_PLUGIN, 'utf8')
    const match = artifact.match(/file:\/\/\/([^'\n]*?)\/media\//)
    return match ? '/' + match[1] + '/media' : null
  } catch (_) {
    return null
  }
}

const SRC = path.resolve(argv[0] || path.join(ROOT, 'vendor/dsh-plugin-eva-theme'))
const OUT = path.resolve(
  argv[1] || (CHECK ? fs.mkdtempSync(path.join(os.tmpdir(), 'eva-build-')) : path.join(ROOT, 'plugin'))
)
const DOCS_OUT = CHECK ? fs.mkdtempSync(path.join(os.tmpdir(), 'eva-docs-')) : path.join(ROOT, 'docs')

// ---------------------------------------------------------------------------
// palette
// ---------------------------------------------------------------------------

const clientPath = path.join(SRC, 'lib/client.js')
const client = fs.readFileSync(clientPath, 'utf8')
const start = client.indexOf('const PALETTE = {')
const end = client.indexOf('\n\t\t};', start)
if (start < 0 || end < 0) throw new Error('PALETTE table not found in ' + clientPath)

const PALETTE = {}
for (const m of client.slice(start + 15, end).matchAll(/^\s*"([a-z0-9-]+)"\s*:\s*\["([^"]+)"\s*,\s*"([^"]+)"\]/gm)) {
  PALETTE[m[1]] = [m[2], m[3]] // [light = Rei, dark = Asuka]
}
const paletteSize = Object.keys(PALETTE).length
if (paletteSize !== 107) throw new Error(`expected 107 palette entries, parsed ${paletteSize}`)

const pick = (token, mode) => {
  const v = PALETTE[token]
  if (!v) throw new Error('missing token ' + token)
  return v[mode]
}

const MAP = {
  background: 'bg-base',
  foreground: 'label-primary',
  card: 'bg-layer-1',
  cardForeground: 'label-primary',
  muted: 'bg-layer-3',
  mutedForeground: 'label-tertiary',
  popover: 'bg-overlay',
  popoverForeground: 'label-primary',
  primary: 'brand-primary',
  primaryForeground: 'label-primary-foreground',
  secondary: 'bg-layer-2',
  secondaryForeground: 'label-secondary',
  accent: 'state-business-primary',
  accentForeground: 'label-primary-foreground',
  border: 'border-l3',
  input: 'bg-layer-2',
  ring: 'brand-primary',
  midground: 'brand-primary',
  composerRing: 'brand-primary',
  destructive: 'state-error-primary',
  destructiveForeground: 'label-primary-foreground',
  sidebarBackground: 'bg-layer-1',
  sidebarBorder: 'border-l2',
  userBubble: 'interactive-bg-hover',
  userBubbleBorder: 'border-l3'
}

const colorsFor = mode => {
  const out = {}
  for (const [hermesKey, token] of Object.entries(MAP)) out[hermesKey] = pick(token, mode)
  return out
}

// The stroke ladder is derived by the host (styles.css color-mix). Repainting
// it from the alias table is what turns the palette into EVA hairlines.
const STROKE_TOKENS = {
  light: {
    '--ui-stroke-primary': pick('border-l4', 0),
    '--ui-stroke-secondary': pick('border-l3', 0),
    '--ui-stroke-tertiary': pick('border-l2', 0),
    '--ui-stroke-quaternary': pick('border-l1', 0),
    '--ui-border': pick('border-l2', 0)
  },
  dark: {
    '--ui-stroke-primary': pick('border-l4', 1),
    '--ui-stroke-secondary': pick('border-l3', 1),
    '--ui-stroke-tertiary': pick('border-l2', 1),
    '--ui-stroke-quaternary': pick('border-l1', 1),
    '--ui-border': pick('border-l2', 1)
  }
}

/** Pilot accents used by the boot overlay.
 *  Asuka's is the dark accent token verbatim; Rei's base hue only exists in the
 *  light palette inside translucent fills (#23799d1f), so it is taken from one
 *  and stripped of its alpha. Keeping both here means the 107-token table stays
 *  the only colour source, and --check guards changes to them. */
const PILOT_ACCENTS = {
  asuka: pick('state-business-primary', 1),
  rei: '#' + pick('bg-multi-select', 0).slice(1, 7)
}

const THEME = {
  name: 'eva',
  label: 'EVA',
  description: 'Evangelion dual-pilot: Asuka dark, Rei light. Ported from dsh-plugin-eva-theme.',
  colors: colorsFor(0),
  darkColors: colorsFor(1),
  typography: {
    fontSans:
      '"Segoe WPC", "Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    fontMono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace, "Apple Color Emoji"'
  }
}

// ---------------------------------------------------------------------------
// media
// ---------------------------------------------------------------------------

/** Only assets the artifact actually loads. Two upstream files (nerv-logo,
 *  eva-entry-plug) are not referenced by this port, so requiring them would
 *  mean asking a user who supplies their own media for two dead files. */
const MEDIA = [
  'svg/nerv-emergency.svg',
  'anim/nerv-boot.gif',
  'art/asuka-avatar-closed-eyes.png',
  'art/rei-avatar-closed-eyes.png',
  'voice/asuka-voice-select.mp3',
  'voice/asuka-voice-boot.mp3',
  'voice/asuka-voice-welcome.mp3',
  'voice/rei-voice-select.mp3',
  'voice/rei-voice-boot.mp3',
  'voice/rei-voice-welcome.mp3'
]

const UPSTREAM_DIRS = { anim: 'animations', art: 'images', svg: 'svg', voice: 'audio' }

const MEDIA_SRC = path.join(ROOT, 'media-src')

/** media-src/<rel> wins when the user supplied their own copy; otherwise the
 *  upstream checkout is the source. Neither is committed: the assets carry
 *  third-party terms (see NOTICE). */
const assetOf = rel => {
  const local = path.join(MEDIA_SRC, rel)
  if (fs.existsSync(local)) return local
  const [dir, file] = rel.split('/')
  const from = path.join(SRC, 'assets', UPSTREAM_DIRS[dir] || dir, file)
  if (!fs.existsSync(from)) {
    throw new Error('missing asset for ' + rel + ' — put it in media-src/' + rel + ' or clone upstream into vendor/')
  }
  return from
}

// ---------------------------------------------------------------------------
// emit
// ---------------------------------------------------------------------------

let mediaBytes = 0
let mediaCount = 0
if (!CHECK) {
  fs.mkdirSync(path.join(OUT, 'media'), { recursive: true })
  for (const rel of MEDIA) {
    const target = path.join(OUT, 'media', rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(assetOf(rel), target)
    mediaBytes += fs.statSync(target).size
    mediaCount++
  }
} else {
  for (const rel of MEDIA) {
    mediaBytes += fs.statSync(assetOf(rel)).size
    mediaCount++
  }
}

// The baked base is the INSTALL path, not the repo path: the renderer resolves
// import.meta.url to blob:file:///<uuid>, so the fallback is what actually
// loads media at runtime.
const mediaFallback = mediaBaseArg || bakedMediaBase() || INSTALL_MEDIA
const body = fs.readFileSync(path.join(ROOT, 'src/body.js'), 'utf8')
  .replace('__MEDIA_FALLBACK__', mediaFallback.replace(/\/$/, ''))

const plugin = [
  '/**',
  ' * EVA theme for Hermes Desktop — generated from dsh-plugin-eva-theme.',
  ' * Do not edit: run build/build.mjs instead.',
  ' *',
  ' *  theme      ' + paletteSize + ' upstream tokens -> ' + Object.keys(MAP).length + ' DesktopThemeColors keys',
  ' *  media      ' + MEDIA.length + ' files referenced over file://',
  ' */',
  "import {",
  '  Button,',
  '  ListRow,',
  '  PALETTE_AREA,',
  '  PANES_AREA,',
  '  SegmentedControl,',
  '  STATUSBAR_AREAS,',
  '  THEMES_AREA,',
  '  ToggleRow,',
  '  host,',
  '  requestTheme,',
  '  useValue',
  "} from '@hermes/plugin-sdk'",
  "import { createElement as h, useEffect, useState } from 'react'",
  '',
  'const EVA_THEME = ' + JSON.stringify(THEME, null, 2),
  '',
  'const PILOT_ACCENTS = ' + JSON.stringify(PILOT_ACCENTS, null, 2),
  '',
  'const STROKE_TOKENS = ' + JSON.stringify(STROKE_TOKENS, null, 2),
  '',
  body
].join('\n')

fs.writeFileSync(path.join(OUT, 'plugin.js'), plugin)
fs.writeFileSync(path.join(OUT, 'eva-theme.theme.json'), JSON.stringify(THEME, null, 2) + '\n')

// ---------------------------------------------------------------------------
// token map — where each of the 107 upstream tokens ends up
// ---------------------------------------------------------------------------

// One row per upstream token. `kind` is one of:
//   mapped    — a DesktopThemeColors key (the host paints it verbatim)
//   overridden— a style rule in the plugin's skin CSS repaints the host's
//               derived semantic variable
//   derived   — the host computes an equivalent from the seeds; the named
//               variable is the one that carries the same role
//   absent    — nothing in Hermes carries this role (DSH-only surface)
const TOKEN_ROWS = [
  ['bg-base', 'mapped', 'background'],
  ['bg-layer-1', 'mapped', 'card, sidebarBackground'],
  ['bg-layer-2', 'mapped', 'secondary, input'],
  ['bg-layer-3', 'mapped', 'muted'],
  ['bg-overlay', 'mapped', 'popover'],
  ['bg-module-platform', 'derived', '--ui-bg-chrome'],
  ['bg-multi-select', 'absent', ''],
  ['bg-skeleton', 'derived', '--ui-bg-quaternary'],
  ['bg-document-preview', 'absent', ''],
  ['label-document-preview', 'absent', ''],
  ['bg-document-selection', 'absent', ''],
  ['bg-mask-1', 'absent', ''],
  ['bg-mask-2', 'absent', ''],
  ['bg-mask-3', 'absent', ''],
  ['bg-mask-drop', 'absent', ''],
  ['bg-mask-photo', 'absent', ''],
  ['border-l1', 'mapped', '--ui-stroke-quaternary'],
  ['border-l2', 'mapped', '--ui-stroke-tertiary, --ui-border'],
  ['border-l3', 'mapped', '--ui-stroke-secondary'],
  ['border-l4', 'mapped', '--ui-stroke-primary'],
  ['border-l2-darkmode-thin', 'absent', ''],
  ['border-inverted', 'derived', '--ui-stroke-primary'],
  ['border-inverted2', 'derived', '--ui-stroke-secondary'],
  ['label-primary', 'mapped', 'foreground, cardForeground, popoverForeground'],
  ['label-secondary', 'mapped', 'secondaryForeground'],
  ['label-tertiary', 'mapped', 'mutedForeground'],
  ['label-caption', 'derived', '--ui-text-quaternary'],
  ['label-primary-dimmed', 'derived', '--ui-text-secondary'],
  ['label-primary-bluish', 'absent', ''],
  ['label-dimmed', 'derived', '--ui-text-quaternary'],
  ['label-primary-inverted', 'derived', '--ui-bg-editor'],
  ['label-primary-foreground', 'mapped', 'primaryForeground, accentForeground, destructiveForeground'],
  ['label-shimmer', 'absent', ''],
  ['label-deep-diving', 'absent', ''],
  ['label-deep-diving-shimmer', 'absent', ''],
  ['brand-primary', 'mapped', 'primary, midground, ring, composerRing'],
  ['brand-primary-invert', 'derived', '--ui-accent-secondary'],
  ['brand-primary-new-colorprimary-new-color', 'absent', ''],
  ['brand-text', 'derived', '--ui-accent'],
  ['button-primary-fill', 'derived', '--ui-bg-primary'],
  ['button-primary-hover', 'derived', '--ui-control-hover-background'],
  ['button-primary-dimmed', 'derived', '--ui-bg-quaternary'],
  ['button-contrast-fill', 'derived', '--ui-bg-elevated'],
  ['button-elevated-fill', 'derived', '--ui-bg-elevated'],
  ['button-floating-fill', 'derived', '--ui-bg-elevated'],
  ['button-floating-hover', 'derived', '--chrome-action-hover'],
  ['button-ghost-active-fill', 'derived', '--ui-row-active-background'],
  ['button-ghost-active-border', 'derived', '--ui-stroke-secondary'],
  ['button-ghost-active-hover', 'derived', '--chrome-action-hover'],
  ['button-info-fill', 'derived', '--ui-bg-secondary'],
  ['button-info-hover', 'derived', '--ui-control-hover-background'],
  ['button-tool-bar-fill', 'derived', '--ui-bg-chrome'],
  ['button-tool-bar-fill-invisible', 'absent', ''],
  ['button-tool-bar-hover', 'derived', '--chrome-action-hover'],
  ['interactive-bg-hover', 'mapped', 'userBubble'],
  ['interactive-bg-hover-accent', 'derived', '--ui-row-hover-background'],
  ['interactive-bg-hover-danger', 'derived', '--ui-red'],
  ['interactive-bg-hover-solid', 'derived', '--ui-bg-quaternary'],
  ['interactive-bg-active', 'derived', '--ui-row-active-background'],
  ['state-business-primary', 'mapped', 'accent'],
  ['state-business-tertiary', 'overridden', '--ui-cyan'],
  ['state-success-primary', 'overridden', '--ui-green'],
  ['state-success-secondary', 'overridden', '--ui-green'],
  ['state-success-tertiary', 'overridden', '--ui-green'],
  ['state-warn-primary', 'overridden', '--ui-yellow'],
  ['state-warn-secondary', 'overridden', '--ui-orange'],
  ['state-warn-tertiary', 'overridden', '--ui-orange'],
  ['state-warn-label', 'overridden', '--ui-yellow'],
  ['state-error-primary', 'mapped', 'destructive'],
  ['state-error-secondary', 'overridden', '--ui-red'],
  ['state-idle-primary', 'overridden', '--ui-cyan'],
  ['link', 'derived', '--ui-accent'],
  ['scrollbar-bg-l1', 'derived', '--ui-stroke-quaternary'],
  ['scrollbar-bg-l2', 'derived', '--ui-stroke-tertiary'],
  ['scrollbar-hover-l1', 'derived', '--ui-stroke-secondary'],
  ['scrollbar-hover-l2', 'derived', '--ui-stroke-primary'],
  ['menu-icon', 'derived', '--ui-text-tertiary'],
  ['menu-group-header-fill', 'derived', '--ui-bg-tertiary'],
  ['tooltip-bg', 'derived', '--ui-bg-elevated'],
  ['tooltip-key-bg', 'derived', '--ui-bg-quaternary'],
  ['toast-bg', 'derived', '--ui-bg-elevated'],
  ['toast-label', 'derived', '--ui-text-primary'],
  ['switch-thumb', 'derived', 'foreground'],
  ['settings-card-fill', 'derived', '--ui-bg-card'],
  ['settings-card-stroke', 'derived', '--ui-stroke-tertiary'],
  ['markdown-code-block', 'derived', '--ui-bg-secondary'],
  ['markdown-code-block-banner', 'derived', '--ui-bg-tertiary'],
  ['markdown-inline-code', 'derived', '--ui-bg-quaternary'],
  ['markdown-citation', 'derived', '--ui-accent'],
  ['markdown-tag', 'derived', '--ui-accent'],
  ['markdown-placeholder', 'derived', '--ui-text-quaternary'],
  ['markdown-code-segment-selected', 'absent', ''],
  ['markdown-code-segment-unselected', 'absent', ''],
  ['code-diff-added', 'derived', '--ui-diff-add-background'],
  ['code-diff-deleted', 'derived', '--ui-diff-remove-background'],
  ['file-diff-added-bg', 'derived', '--ui-diff-add-background'],
  ['file-diff-added-gutter', 'derived', '--ui-diff-add-border'],
  ['file-diff-added-marker', 'derived', '--ui-diff-add-foreground'],
  ['file-diff-deleted-bg', 'derived', '--ui-diff-remove-background'],
  ['file-diff-deleted-gutter', 'derived', '--ui-diff-remove-border'],
  ['file-diff-deleted-marker', 'derived', '--ui-diff-remove-foreground'],
  ['onboarding-accent', 'derived', '--ui-accent'],
  ['onboarding-card-fill', 'derived', '--ui-bg-elevated'],
  ['onboarding-checkbox-border', 'derived', '--ui-stroke-secondary'],
  ['onboarding-secondary-fill', 'derived', '--ui-bg-secondary'],
  ['turn-trigger-bg', 'absent', ''],
  ['turn-trigger-bg-hover', 'absent', '']
]

const KIND_LABEL = {
  mapped: 'mapped',
  overridden: 'overridden',
  derived: 'derived',
  absent: 'absent'
}

const tokenRows = TOKEN_ROWS.filter(([token]) => token in PALETTE)
const docsDir = DOCS_OUT
fs.mkdirSync(docsDir, { recursive: true })

const counts = { mapped: 0, overridden: 0, derived: 0, absent: 0 }
for (const [, kind] of tokenRows) counts[kind]++

const tokenDoc = [
  '# EVA palette: 107 upstream tokens in Hermes Desktop',
  '',
  'Generated by `build/build.mjs` from the `PALETTE` table in',
  '`dsh-plugin-eva-theme/lib/client.js`. Do not edit by hand: it is rewritten on',
  'every build, and the build fails when a token is unaccounted for.',
  '',
  '## Why this table exists',
  '',
  'The upstream plugin paints 107 `--dsw-alias-*` variables directly. Hermes',
  'Desktop does not expose that layer: a theme carries ' + Object.keys(MAP).length + ' colour keys',
  '(`DesktopThemeColors`), and `src/styles.css` derives everything else from them',
  'with `color-mix()`. So a port cannot be a one-to-one assignment, and this',
  'table records what each upstream token became.',
  '',
  'Four outcomes:',
  '',
  '- `mapped` — a `DesktopThemeColors` key (or the stroke ladder written by the',
  '  theme plugin) carries the token. ' + counts.mapped + ' tokens.',
  '- `overridden` — the plugin\'s own stylesheet repaints the semantic variable the',
  '  host derives (`--ui-green`, `--ui-red`, `--ui-yellow`, `--ui-orange`,',
  '  `--ui-cyan`). The host\'s seed layer is untouched. ' + counts.overridden + ' tokens.',
  '- `derived` — the host computes the same role from the seeds; the named',
  '  variable is the one that carries it. The exact upstream hex is not',
  '  reproduced, and is not meant to be: EVA\'s greys come from its own seeds.',
  '  ' + counts.derived + ' tokens.',
  '- `absent` — nothing in Hermes Desktop carries this role. These are DSH-only',
  '  surfaces (document preview, mask layers, code-segment tabs, the turn',
  '  trigger, shimmer animations), plus `brand-primary-new-colorprimary-new-color`,',
  '  which is a malformed duplicate of `brand-primary` in the upstream table.',
  '  ' + counts.absent + ' tokens.',
  '',
  'Total: ' + tokenRows.length + ' of ' + paletteSize + ' tokens.',
  '',
  '## Values',
  '',
  'Light is Rei, dark is Asuka. Both columns are the upstream value as published.',
  'Only a `mapped` row sets that exact hex in Hermes; a `derived` row lands on a',
  'host variable that mixes toward its own seeds.',
  '',
  '| # | token | light (Rei) | dark (Asuka) | outcome | Hermes target |',
  '|---|---|---|---|---|---|'
]

tokenRows.forEach(([token, kind, target], index) => {
  const [light, dark] = PALETTE[token]
  tokenDoc.push(
    '| ' + (index + 1) + ' | `' + token + '` | `' + light + '` | `' + dark + '` | ' + KIND_LABEL[kind] + ' | ' + (target ? '`' + target + '`' : '—') + ' |'
  )
})

tokenDoc.push(
  '',
  '## What the theme itself sets',
  '',
  '`DesktopThemeColors` (' + Object.keys(MAP).length + ' keys) plus `typography`, both modes:',
  '',
  '| Hermes key | upstream token |',
  '|---|---|'
)

for (const [hermesKey, token] of Object.entries(MAP)) tokenDoc.push('| `' + hermesKey + '` | `' + token + '` |')

tokenDoc.push(
  '',
  'The plugin repaints the stroke ladder itself (`--ui-stroke-primary..quaternary`',
  'and `--ui-border`). The host otherwise derives those variables with',
  '`color-mix()` from the accent, which washes out EVA\'s hairline contrast:',
  '',
  '| Hermes variable | upstream token |',
  '|---|---|'
)

for (const [variable, value] of Object.entries(STROKE_TOKENS.light)) {
  const token = Object.keys(PALETTE).find(name => PALETTE[name][0] === value) || '?'
  tokenDoc.push('| `' + variable + '` | `' + token + '` |')
}

tokenDoc.push(
  '',
  '## Not carried over on purpose',
  '',
  'The upstream client also ships 104 `querySelector` calls that patch DSH CSS',
  'module class names (composer placeholder, sidebar rows, context menus). Most of',
  'those selectors have no stable Hermes equivalent; the few that do would require',
  'reaching into host markup, which the plugin catalogue forbids. This port excludes',
  'both groups instead of approximating them. The decoration it does carry',
  '(scanlines, Mincho headings, tabular numerals, hairlines) lives in the plugin',
  'stylesheet, scoped to `:root[data-hermes-theme="eva"]`.',
  ''
)

const tokenPath = path.join(docsDir, 'theme-tokens.md')
fs.writeFileSync(tokenPath, tokenDoc.join('\n'))


// ---------------------------------------------------------------------------
// assertions
// ---------------------------------------------------------------------------

// Every name the emitted module imports must exist in the host SDK, or the
// runtime shim fails at load with a bare "does not provide an export" error.
// Read the SDK barrel and collect what it really exports.
const SDK_INDEX = path.join(APP_SRC, 'sdk/index.ts')

function sdkExportNames(file) {
  const source = fs.readFileSync(file, 'utf8')
  const names = new Set()

  for (const block of source.matchAll(/export\s*\{([\s\S]*?)\}\s*(?:from\s*'[^']*')?/g)) {
    for (const part of block[1].split(',')) {
      const cleaned = part.replace(/\btype\b/g, '').trim()
      if (!cleaned) continue
      const alias = cleaned.split(/\s+as\s+/)
      names.add((alias[1] || alias[0]).trim())
    }
  }

  for (const m of source.matchAll(/export\s+(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1])
  }

  return names
}

const sdkNames = sdkExportNames(SDK_INDEX)
const NEEDED_FROM_SDK = [
  'Button',
  'ListRow',
  'PALETTE_AREA',
  'PANES_AREA',
  'SegmentedControl',
  'STATUSBAR_AREAS',
  'THEMES_AREA',
  'ToggleRow',
  'host',
  'requestTheme',
  'useValue'
]
const missingFromSdk = NEEDED_FROM_SDK.filter(name => !sdkNames.has(name))

// --- the token table must account for every upstream token, exactly once, and
// --- every Hermes target it names must exist in the host.
const docTokens = TOKEN_ROWS.map(row => row[0])
const duplicateRows = docTokens.filter((token, index) => docTokens.indexOf(token) !== index)
const missingRows = Object.keys(PALETTE).filter(token => !docTokens.includes(token))
const unknownRows = docTokens.filter(token => !(token in PALETTE))

const cssVars = new Set(
  [...fs.readFileSync(path.join(APP_SRC, 'styles.css'), 'utf8').matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1])
)
const PLUGIN_VARS = new Set([
  '--ui-stroke-primary',
  '--ui-stroke-secondary',
  '--ui-stroke-tertiary',
  '--ui-stroke-quaternary',
  '--ui-border',
  '--eva-scanline'
])
const namedVars = new Set()
const namedKeys = new Set()
for (const [, , target] of TOKEN_ROWS) {
  for (const part of (target || '').split(',')) {
    const name = part.trim()
    if (!name) continue
    if (name.startsWith('--')) namedVars.add(name)
    else namedKeys.add(name)
  }
}
const unknownVars = [...namedVars].filter(name => !cssVars.has(name) && !PLUGIN_VARS.has(name))
const unknownKeys = [...namedKeys].filter(name => !(name in MAP))
const tokenMapOk =
  docTokens.length === 107 &&
  duplicateRows.length === 0 &&
  missingRows.length === 0 &&
  unknownRows.length === 0 &&
  unknownVars.length === 0 &&
  unknownKeys.length === 0

const hex = h => {
  const s = h.replace('#', '')
  const full = s.length === 3 ? s.split('').map(c => c + c).join('') : s.slice(0, 6)
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16))
}
const lum = h => {
  const [r, g, b] = hex(h).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const PAIRS = [
  ['foreground', 'background'],
  ['mutedForeground', 'muted'],
  ['secondaryForeground', 'secondary'],
  ['primaryForeground', 'primary'],
  ['accentForeground', 'accent'],
  ['destructiveForeground', 'destructive'],
  ['foreground', 'sidebarBackground']
]

let failures = 0
for (const [modeName, table] of [['light/Rei', THEME.colors], ['dark/Asuka', THEME.darkColors]]) {
  for (const [fg, bg] of PAIRS) {
    const ratio = contrast(table[fg], table[bg])
    const ok = ratio >= 4.5
    if (!ok) failures++
    console.log(`${modeName.padEnd(10)} ${(fg + ' on ' + bg).padEnd(40)} ${ratio.toFixed(2)} ${ok ? 'AA' : 'FAIL'}`)
  }
}

const required = ['background', 'foreground', 'primary']
const shapeOk =
  typeof THEME.name === 'string' &&
  typeof THEME.label === 'string' &&
  required.every(k => typeof THEME.colors[k] === 'string')

console.log('---')
console.log('tokens parsed        :', paletteSize)
console.log('theme colour keys    :', Object.keys(MAP).length)
console.log('media files ' + (CHECK ? 'checked' : 'copied ') + '     :', mediaCount, '(' + (mediaBytes / 1048576).toFixed(2) + ' MB)')
console.log('isValidTheme shape   :', shapeOk ? 'PASS' : 'FAIL')
console.log('sdk names checked    :', NEEDED_FROM_SDK.length, missingFromSdk.length ? 'MISSING ' + missingFromSdk.join(',') : 'all present')
console.log('pilot accents        :', PILOT_ACCENTS.asuka, PILOT_ACCENTS.rei,
  /^#[0-9a-f]{6}$/i.test(PILOT_ACCENTS.asuka) && /^#[0-9a-f]{6}$/i.test(PILOT_ACCENTS.rei) ? 'from palette' : 'MALFORMED')
console.log('token rows           :', docTokens.length,
  missingRows.length ? 'MISSING ' + missingRows.join(',') : 'complete',
  duplicateRows.length ? 'DUPES ' + duplicateRows.join(',') : '', 
  unknownRows.length ? 'UNKNOWN ' + unknownRows.join(',') : '')
console.log('documented targets   :', namedVars.size, 'vars /', namedKeys.size, 'theme keys',
  unknownVars.length || unknownKeys.length ? 'UNRESOLVED ' + [...unknownVars, ...unknownKeys].join(',') : 'all resolve')
console.log('token doc            :', path.join(DOCS_OUT, 'theme-tokens.md'))
console.log('contrast failures    :', failures)
console.log('plugin.js            :', path.join(OUT, 'plugin.js'))
// --- --check: the committed artifacts must be byte-identical to a fresh build
let drift = 0
if (CHECK) {
  const pairs = [
    [path.join(OUT, 'plugin.js'), COMMITTED_PLUGIN],
    [path.join(OUT, 'eva-theme.theme.json'), path.join(ROOT, 'plugin/eva-theme.theme.json')],
    [path.join(DOCS_OUT, 'theme-tokens.md'), COMMITTED_DOC]
  ]
  for (const [fresh, committed] of pairs) {
    const next = fs.existsSync(fresh) ? fs.readFileSync(fresh) : null
    const repo = fs.existsSync(committed) ? fs.readFileSync(committed) : null
    const same = Boolean(next && repo && next.equals(repo))
    if (!same) drift++
    console.log(
      'check ' + path.relative(ROOT, committed).padEnd(32) +
        (same ? 'identical' : !next ? 'no fresh build' : !repo ? 'MISSING in repo' : 'DRIFT')
    )
  }
}

process.exit(shapeOk && failures === 0 && missingFromSdk.length === 0 && tokenMapOk && drift === 0 ? 0 : 1)
