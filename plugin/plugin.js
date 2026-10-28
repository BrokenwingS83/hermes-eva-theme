/**
 * EVA theme for Hermes Desktop — generated from dsh-plugin-eva-theme.
 * Do not edit: run build/build.mjs instead.
 *
 *  theme      107 upstream tokens -> 25 DesktopThemeColors keys
 *  media      10 files referenced over file://
 */
import {
  Button,
  ListRow,
  PALETTE_AREA,
  PANES_AREA,
  SegmentedControl,
  STATUSBAR_AREAS,
  THEMES_AREA,
  ToggleRow,
  host,
  requestTheme,
  useValue
} from '@hermes/plugin-sdk'
import { createElement as h, useEffect, useState } from 'react'

const EVA_THEME = {
  "name": "eva",
  "label": "EVA",
  "description": "Evangelion dual-pilot: Asuka dark, Rei light. Ported from dsh-plugin-eva-theme.",
  "colors": {
    "background": "#eff6fa",
    "foreground": "#203849",
    "card": "#f7fbfd",
    "cardForeground": "#203849",
    "muted": "#e4eef5",
    "mutedForeground": "#526c7c",
    "popover": "#ffffff",
    "popoverForeground": "#203849",
    "primary": "#176b91",
    "primaryForeground": "#ffffff",
    "secondary": "#ffffff",
    "secondaryForeground": "#476173",
    "accent": "#176b91",
    "accentForeground": "#ffffff",
    "border": "#28698a40",
    "input": "#ffffff",
    "ring": "#176b91",
    "midground": "#176b91",
    "composerRing": "#176b91",
    "destructive": "#ad3d57",
    "destructiveForeground": "#ffffff",
    "sidebarBackground": "#f7fbfd",
    "sidebarBorder": "#28698a29",
    "userBubble": "#23799d14",
    "userBubbleBorder": "#28698a40"
  },
  "darkColors": {
    "background": "#0d0f13",
    "foreground": "#fff1e7",
    "card": "#14171c",
    "cardForeground": "#fff1e7",
    "muted": "#272c35",
    "mutedForeground": "#b3a294",
    "popover": "#20252d",
    "popoverForeground": "#fff1e7",
    "primary": "#ff354d",
    "primaryForeground": "#101116",
    "secondary": "#1c2028",
    "secondaryForeground": "#c6b7ac",
    "accent": "#ff354d",
    "accentForeground": "#101116",
    "border": "#f33a5157",
    "input": "#1c2028",
    "ring": "#ff354d",
    "midground": "#ff354d",
    "composerRing": "#ff354d",
    "destructive": "#ff8494",
    "destructiveForeground": "#101116",
    "sidebarBackground": "#14171c",
    "sidebarBorder": "#f33a513d",
    "userBubble": "#ff354d14",
    "userBubbleBorder": "#f33a5157"
  },
  "typography": {
    "fontSans": "\"Segoe WPC\", \"Segoe UI\", -apple-system, BlinkMacSystemFont, \"SF Pro Text\", system-ui, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\"",
    "fontMono": "\"JetBrains Mono\", \"SF Mono\", ui-monospace, Menlo, monospace, \"Apple Color Emoji\""
  }
}

const PILOT_ACCENTS = {
  "asuka": "#ff354d",
  "rei": "#23799d"
}

const STROKE_TOKENS = {
  "light": {
    "--ui-stroke-primary": "#28698a59",
    "--ui-stroke-secondary": "#28698a40",
    "--ui-stroke-tertiary": "#28698a29",
    "--ui-stroke-quaternary": "#28698a17",
    "--ui-border": "#28698a29"
  },
  "dark": {
    "--ui-stroke-primary": "#f33a517a",
    "--ui-stroke-secondary": "#f33a5157",
    "--ui-stroke-tertiary": "#f33a513d",
    "--ui-stroke-quaternary": "#f33a5124",
    "--ui-border": "#f33a513d"
  }
}

/**
 * EVA plugin body — logic only. The generator prepends the import line, the
 * theme object and the token tables, then writes the final plugin.js.
 *
 * Layers:
 *   1) theme      — DesktopTheme registered into THEMES_AREA
 *   2) skin CSS   — the part a palette cannot express (scanlines, hairlines,
 *                   Mincho headings, tabular numbers)
 *   3) boot       — vanilla-DOM overlay: gif -> alarm -> typing -> pilot
 *                   select -> sync -> doors. No React in <body>.
 *   4) beacons    — ctx.storage markers so a run can be audited from disk
 */

const PACKAGE_ID = 'eva-theme'
const SKIN_STYLE_ID = PACKAGE_ID + ':skin'
const BOOT_STYLE_ID = PACKAGE_ID + ':boot'
const BOOT_SESSION_KEY = PACKAGE_ID + ':booted'
/** A hot reload in a long-lived window must not replay the boot: only a fresh
 *  app start (module loaded within this window of timeOrigin) may. */
const BOOT_MAX_UPTIME_MS = 40000

const MEDIA_BASE = (() => {
  try {
    const url = new URL('./media/', import.meta.url)
    if (url.protocol === 'file:') return url.href
  } catch (_) {
    /* blob: or opaque base — fall through */
  }
  return 'file:///Users/xiaoxiangzhang/.hermes/desktop-plugins/eva-theme/media/'
})()

const media = (rel) => MEDIA_BASE + rel

/** The voice clip currently playing. Stopped on dispose or when replaced. */
let activeAudio = null
const stopVoice = () => {
  if (!activeAudio) return
  try {
    activeAudio.pause()
    activeAudio.removeAttribute('src')
  } catch (_) {}
  activeAudio = null
}

const COPY = {
  zh: { title: '选择你的驾驶员', sub: '神经接续开始', sync: '同步中', skip: '按 Esc 跳过', loading: '装载中' },
  ja: { title: 'パイロットを選択', sub: '神経接続を開始します', sync: 'シンクロ中', skip: 'Esc でスキップ', loading: 'ロード中' },
  en: { title: 'SELECT YOUR PILOT', sub: 'NEURAL LINK STARTING', sync: 'SYNCHRONIZING', skip: 'Esc to skip', loading: 'LOADING' }
}

/** Accents are injected from the upstream palette (see build/build.mjs), so
 *  the 107-token table stays the only colour source. */
const PILOTS = [
  { id: 'asuka', name: 'ASUKA', number: '02', accent: PILOT_ACCENTS.asuka, avatar: 'art/asuka-avatar-closed-eyes.png', select: 'voice/asuka-voice-select.mp3', boot: 'voice/asuka-voice-boot.mp3', welcome: 'voice/asuka-voice-welcome.mp3' },
  { id: 'rei', name: 'REI', number: '00', accent: PILOT_ACCENTS.rei, avatar: 'art/rei-avatar-closed-eyes.png', select: 'voice/rei-voice-select.mp3', boot: 'voice/rei-voice-boot.mp3', welcome: 'voice/rei-voice-welcome.mp3' }
]

// ---------------------------------------------------------------------------
// 2) skin CSS
// ---------------------------------------------------------------------------

const SKIN_CSS = `
:root[data-hermes-theme="eva"] body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147482000;
  background: repeating-linear-gradient(to bottom, rgba(35, 121, 157, 0.05) 0 1px, transparent 1px 3px);
  opacity: calc(0.5 * var(--eva-scanline, 1));
}
:root[data-hermes-theme="eva"][data-hermes-mode="dark"] body::after {
  background: repeating-linear-gradient(to bottom, rgba(255, 53, 77, 0.06) 0 1px, transparent 1px 3px);
  opacity: calc(0.6 * var(--eva-scanline, 1));
}
:root[data-hermes-theme="eva"] h1,
:root[data-hermes-theme="eva"] h2,
:root[data-hermes-theme="eva"] h3 {
  font-family: 'Songti SC', 'STSong', 'Noto Serif CJK SC', 'Times New Roman', serif;
  letter-spacing: 0.04em;
}
:root[data-hermes-theme="eva"] {
  font-variant-numeric: tabular-nums;
  --ui-orange: #e5a24f;
  --ui-yellow: #e5a24f;
  --ui-red: #ff354d;
  --ui-green: #8dc358;
}
@media (prefers-reduced-motion: reduce) {
  :root[data-hermes-theme="eva"] body::after { display: none; }
}
`

const tokenCss = () => {
  const rows = []
  for (const mode of ['light', 'dark']) {
    const table = STROKE_TOKENS[mode] || {}
    const decls = Object.entries(table).map(([k, v]) => k + ':' + v).join(';')
    if (decls) rows.push(':root[data-hermes-theme="eva"][data-hermes-mode="' + mode + '"]{' + decls + '}')
  }
  return SKIN_CSS + '\n' + rows.join('\n')
}

let styleEl = null
const mountSkin = (ctx) => {
  if (styleEl && styleEl.isConnected) return
  styleEl = styleEl || document.getElementById(SKIN_STYLE_ID) || document.createElement('style')
  styleEl.id = SKIN_STYLE_ID
  styleEl.textContent = tokenCss()
  if (!styleEl.isConnected) document.head.appendChild(styleEl)
  applyScanline(ctx)
}
const unmountSkin = () => {
  if (styleEl) styleEl.remove()
  styleEl = null
  try {
    document.documentElement.style.removeProperty('--eva-scanline')
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// settings — one reader, so the pane, the chip and the Settings page agree
// ---------------------------------------------------------------------------

const SCANLINE_OPACITY = { off: 0, low: 0.45, normal: 1 }
const CLOCK_SCALES = [0.85, 1, 1.2]

const settingsOf = (ctx) => {
  // Every read sits inside the guard: storage can throw (quota, disabled
  // localStorage), and this runs in the MAGI pane's render, where a throw
  // takes the whole pane down. A failed read falls back to the default.
  const settings = { bootEnabled: true, clockScale: 1, language: 'zh', scanline: 'normal', soundEnabled: true }
  try {
    const storedLang = ctx.storage.get('bootLanguage', 'zh')
    const storedScanline = ctx.storage.get('scanline', 'normal')
    const storedScale = Number(ctx.storage.get('clockScale', 1))
    if (COPY[storedLang]) settings.language = storedLang
    if (storedScanline in SCANLINE_OPACITY) settings.scanline = storedScanline
    if (CLOCK_SCALES.includes(storedScale)) settings.clockScale = storedScale
    settings.bootEnabled = ctx.storage.get('bootEnabled', true) !== false
    settings.soundEnabled = ctx.storage.get('soundEnabled', true) !== false
  } catch (_) {}
  return settings
}

const applyScanline = (ctx) => {
  try {
    const { scanline } = settingsOf(ctx)
    document.documentElement.style.setProperty('--eva-scanline', String(SCANLINE_OPACITY[scanline]))
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// MAGI pane — clock, pilot, model, session, live usage, billing window
// ---------------------------------------------------------------------------

/** DeepSeek peak hours, straight from the pricing page: Mon-Fri 01:00-04:00
 *  and 06:00-10:00 UTC; everything else (weekends, Chinese public holidays) is
 *  off-peak at half price. Holidays are not excluded — the agent's own pricing
 *  table (`agent/usage_pricing.py`) does not exclude them either, so the chip
 *  and the billed rate agree. */
const PEAK_UTC_WINDOWS = [
  [1, 4],
  [6, 10]
]

const isPeakUtc = (date) => {
  const day = date.getUTCDay()
  if (day === 0 || day === 6) return false
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60
  return PEAK_UTC_WINDOWS.some(([from, to]) => hour >= from && hour < to)
}

/** Current band plus the next flip. Walks the calendar a minute at a time
 *  (bounded at 72h — Friday 10:00 UTC to Monday 01:00 UTC is the longest gap)
 *  instead of hard-coding boundary arithmetic that has to special-case the
 *  weekend. */
const billingNow = (now) => {
  const peak = isPeakUtc(now)
  for (let minutes = 1; minutes <= 72 * 60; minutes++) {
    const at = new Date(now.getTime() + minutes * 60000)
    if (isPeakUtc(at) !== peak) return { peak, flipsAt: at, minutes }
  }
  return { peak, flipsAt: null, minutes: null }
}

const pad2 = (n) => (n < 10 ? '0' : '') + n
const clockText = (date) => pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds())
const countdownText = (minutes) => {
  if (!Number.isFinite(minutes)) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? h + 'h ' + pad2(m) + 'm' : m + 'm'
}

const ROW_STYLE = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '5px 0',
  borderBottom: '1px solid color-mix(in srgb, var(--ui-stroke-tertiary) 60%, transparent)'
}
const LABEL_STYLE = {
  fontSize: '9px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--ui-text-quaternary)',
  whiteSpace: 'nowrap'
}
const VALUE_STYLE = {
  fontSize: '11px',
  color: 'var(--ui-text-secondary)',
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
}

/** `data-hermes-mode` is what the host repaints on theme/mode changes; the
 *  pilot binding (dark = Asuka, light = Rei) reads straight from it. */
function useThemeMode() {
  const read = () => (document.documentElement.dataset.hermesMode === 'dark' ? 'dark' : 'light')
  const [mode, setMode] = useState(read)
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => setMode(read()))
    observer.observe(root, { attributeFilter: ['data-hermes-mode', 'data-hermes-theme'], attributes: true })
    return () => observer.disconnect()
  }, [])
  return mode
}

function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function MagiPane({ ctx }) {
  const mode = useThemeMode()
  const now = useNow(1000)
  const model = useValue(host.state.model)
  const usage = useValue(host.state.focusedUsage)
  const sessionId = useValue(host.state.activeSessionId)
  const busy = useValue(host.state.busy)
  const pilot = PILOTS[mode === 'dark' ? 0 : 1]
  const billing = billingNow(now)
  const accent = mode === 'dark' ? 'var(--ui-red)' : 'var(--ui-accent)'
  const scale = settingsOf(ctx).clockScale

  // Nothing is invented when the backend has not reported yet: a missing
  // reading is an em dash, never a zero.
  const tps = usage && Number.isFinite(usage.avg_tps) ? usage.avg_tps.toFixed(1) : '—'
  const context = usage && Number.isFinite(usage.context_percent) ? Math.round(usage.context_percent) + '%' : '—'
  const tokens = usage && Number.isFinite(usage.total) ? usage.total.toLocaleString('en-US') : '—'
  const cost = usage && Number.isFinite(usage.cost_usd) ? '$' + usage.cost_usd.toFixed(4) : '—'

  const row = (label, value, tone) =>
    h(
      'div',
      { style: ROW_STYLE },
      h('span', { style: LABEL_STYLE }, label),
      h('span', { style: tone ? { ...VALUE_STYLE, color: tone } : VALUE_STYLE }, value)
    )

  return h(
    'div',
    { 'data-eva-magi': 'true', style: { display: 'flex', flexDirection: 'column', padding: '12px 14px', gap: '2px', minWidth: 0 } },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: '7px', paddingBottom: '8px' } },
      h('span', {
        style: { width: '6px', height: '6px', background: accent, boxShadow: '0 0 6px ' + accent, flex: 'none' }
      }),
      h(
        'span',
        { style: { fontSize: '10px', letterSpacing: '0.22em', color: 'var(--ui-text-secondary)' } },
        'MAGI · ' + pilot.name
      ),
      h(
        'span',
        { style: { marginLeft: 'auto', fontSize: '9px', letterSpacing: '0.14em', color: 'var(--ui-text-quaternary)' } },
        busy ? 'SYNC' : 'IDLE'
      )
    ),
    h(
      'div',
      {
        'data-eva-clock': 'true',
        style: {
          fontSize: (22 * scale).toFixed(1) + 'px',
          lineHeight: 1.15,
          letterSpacing: '0.06em',
          color: 'var(--ui-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          paddingBottom: '6px'
        }
      },
      clockText(now)
    ),
    row('PILOT', pilot.name + ' · ' + pilot.number, accent),
    row('MODEL', model || '—'),
    row('SESSION', sessionId ? String(sessionId).slice(0, 8) : 'draft'),
    row('TPS', tps),
    row('CONTEXT', context),
    row('TOKENS', tokens),
    row('COST', cost),
    row('WINDOW', billing.peak ? 'PEAK · 2x' : 'OFF-PEAK · ½', billing.peak ? 'var(--ui-yellow)' : 'var(--ui-green)'),
    row('NEXT', (billing.peak ? 'off-peak in ' : 'peak in ') + countdownText(billing.minutes))
  )
}

/** Statusbar chip: pilot + billing band. Same numbers as the pane, no clock. */
function EvaChip({ ctx }) {
  const mode = useThemeMode()
  const now = useNow(30000)
  const pilot = PILOTS[mode === 'dark' ? 0 : 1]
  const billing = billingNow(now)
  const accent = mode === 'dark' ? 'var(--ui-red)' : 'var(--ui-accent)'
  return h(
    'span',
    {
      'data-eva-chip': 'true',
      title: (billing.peak ? 'Peak window — 2x list price. ' : 'Off-peak — half price. ') +
        (billing.flipsAt ? 'Changes at ' + clockText(billing.flipsAt).slice(0, 5) : ''),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '0 6px',
        height: '100%',
        fontSize: '10px',
        letterSpacing: '0.12em',
        color: 'var(--ui-text-tertiary)',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap'
      }
    },
    h('span', {
      style: { width: '5px', height: '5px', background: accent, flex: 'none', boxShadow: '0 0 5px ' + accent }
    }),
    h('span', null, pilot.name),
    h('span', { style: { color: 'var(--ui-text-quaternary)' } }, '·'),
    h(
      'span',
      { style: { color: billing.peak ? 'var(--ui-yellow)' : 'var(--ui-text-tertiary)' } },
      billing.peak ? 'PEAK' : 'OFF-PEAK'
    )
  )
}

// ---------------------------------------------------------------------------
// Settings ▸ Plugins ▸ EVA
// ---------------------------------------------------------------------------

function EvaSettings({ ctx }) {
  const [state, setState] = useState(() => settingsOf(ctx))

  const save = (key, value) => {
    try {
      ctx.storage.set(key, value)
    } catch (_) {}
    setState(settingsOf(ctx))
    if (key === 'scanline') applyScanline(ctx)
  }

  const reset = () => {
    for (const key of ['bootEnabled', 'bootLanguage', 'soundEnabled', 'scanline', 'clockScale']) {
      try {
        ctx.storage.remove(key)
      } catch (_) {}
    }
    setState(settingsOf(ctx))
    applyScanline(ctx)
    host.notify({ kind: 'info', message: 'EVA settings reset to defaults.' })
  }

  const language = h(SegmentedControl, {
    options: [
      { id: 'zh', label: '中文' },
      { id: 'ja', label: '日本語' },
      { id: 'en', label: 'EN' }
    ],
    value: state.language,
    onChange: (id) => save('bootLanguage', id)
  })

  const scanline = h(SegmentedControl, {
    options: [
      { id: 'off', label: 'Off' },
      { id: 'low', label: 'Low' },
      { id: 'normal', label: 'Full' }
    ],
    value: state.scanline,
    onChange: (id) => save('scanline', id)
  })

  const scale = h(SegmentedControl, {
    options: [
      { id: '0.85', label: 'S' },
      { id: '1', label: 'M' },
      { id: '1.2', label: 'L' }
    ],
    value: String(state.clockScale),
    onChange: (id) => save('clockScale', Number(id))
  })

  return h('div', {
    'data-eva-settings': 'true',
    style: { display: 'flex', flexDirection: 'column', gap: '2px' },
    children: [
      h(ToggleRow, {
        key: 'boot',
        label: 'Pilot boot sequence',
        description: 'Play the NERV boot overlay once on a fresh launch.',
        checked: state.bootEnabled,
        onChange: (on) => save('bootEnabled', on)
      }),
      h(ToggleRow, {
        key: 'sound',
        label: 'Boot sounds',
        description: 'Pilot voice clips during the boot sequence.',
        checked: state.soundEnabled,
        onChange: (on) => save('soundEnabled', on)
      }),
      h(ListRow, { key: 'lang', title: 'Boot language', description: 'Wording of the pilot selection screen.', action: language }),
      h(ListRow, { key: 'scan', title: 'Scanlines', description: 'CRT overlay strength across the window.', action: scanline }),
      h(ListRow, { key: 'clock', title: 'MAGI clock size', description: 'Type scale of the clock in the MAGI pane.', action: scale }),
      h('div', {
        key: 'reset',
        style: { display: 'flex', justifyContent: 'flex-end', paddingTop: '14px' },
        children: h(Button, { variant: 'secondary', onClick: reset, children: 'Reset EVA settings' })
      })
    ]
  })
}


// ---------------------------------------------------------------------------
// 3) boot overlay
// ---------------------------------------------------------------------------

const BOOT_CSS = `
.eva-boot { position: fixed; inset: 0; z-index: 2147483000; display: flex; align-items: center; justify-content: center;
  background: #000101; color: #e8e4dc; font-family: -apple-system, 'Segoe UI', system-ui, sans-serif;
  -webkit-user-select: none; user-select: none; cursor: default; }
.eva-boot * { box-sizing: border-box; }
.eva-boot-stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.eva-boot-img { max-width: 62vw; max-height: 62vh; image-rendering: auto; }
.eva-boot-alarm { width: min(70vw, 760px); opacity: 0; animation: eva-alarm-pulse 1.1s ease-in-out infinite; }
@keyframes eva-alarm-pulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
.eva-boot-type { font-size: clamp(20px, 3.2vw, 40px); letter-spacing: .28em; color: #ff354d;
  font-family: 'Songti SC', 'STSong', serif; white-space: pre; }
.eva-boot-caret { display: inline-block; width: .5em; background: #ff354d; animation: eva-blink .7s steps(1) infinite; }
@keyframes eva-blink { 50% { opacity: 0 } }
.eva-boot-pilots { display: flex; gap: clamp(24px, 6vw, 96px); }
.eva-boot-card { width: clamp(160px, 20vw, 260px); padding: 18px; border: 1px solid rgba(232,228,220,.28);
  background: rgba(255,255,255,.02); display: flex; flex-direction: column; align-items: center; gap: 12px;
  cursor: pointer; transition: border-color .25s ease, transform .25s ease, background .25s ease; }
.eva-boot-card:hover, .eva-boot-card:focus-visible { outline: none; transform: translateY(-4px); }
.eva-boot-card img { width: 100%; height: auto; display: block; filter: grayscale(.15); }
.eva-boot-card .n { font-size: 12px; letter-spacing: .3em; opacity: .7 }
.eva-boot-card .nm { font-family: 'Songti SC', serif; letter-spacing: .18em; font-size: 15px }
.eva-boot-hint { position: absolute; bottom: 28px; left: 0; right: 0; text-align: center; font-size: 12px;
  letter-spacing: .22em; opacity: .45 }
.eva-boot-sync { width: min(62vw, 560px); display: flex; flex-direction: column; gap: 14px; align-items: center }
.eva-boot-bar { width: 100%; height: 2px; background: rgba(232,228,220,.18); overflow: hidden }
.eva-boot-bar span { display: block; height: 100%; width: 0; transition: width .18s linear }
.eva-boot-label { font-size: 12px; letter-spacing: .3em; opacity: .7 }
.eva-boot-door { position: absolute; top: 0; bottom: 0; width: 50%; background: #0a0b0d;
  border-left: 1px solid rgba(255,53,77,.35); border-right: 1px solid rgba(255,53,77,.35);
  transition: transform .9s cubic-bezier(.7,0,.3,1) }
.eva-boot-door.l { left: 0 }
.eva-boot-door.r { right: 0 }
.eva-boot-open .eva-boot-door.l { transform: translateX(-100%) }
.eva-boot-open .eva-boot-door.r { transform: translateX(100%) }
`

const el = (tag, props, ...kids) => {
  const node = document.createElement(tag)
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v
      else if (k === 'html') node.innerHTML = v
      else if (k === 'text') node.textContent = v
      else if (k === 'style') node.setAttribute('style', v)
      else node.setAttribute(k, v)
    }
  }
  for (const kid of kids) if (kid) node.appendChild(kid)
  return node
}

/**
 * Run the boot sequence once. Returns true when it actually ran.
 * Every exit path goes through finish(), which removes the overlay, the style
 * element, timers and listeners — the host must be usable afterwards.
 */
function runBoot(ctx, opts) {
  const lang = COPY[opts.language] ? opts.language : 'zh'
  const copy = COPY[lang]
  const trace = { startedAt: new Date().toISOString(), media_base: MEDIA_BASE, phases: [] }
  const started = performance.now()
  const timers = new Set()
  let disposed = false
  let audio = null

  const style = el('style', { id: BOOT_STYLE_ID, text: BOOT_CSS })
  const root = el('div', { class: 'eva-boot', role: 'dialog', 'aria-label': copy.title })

  const mark = (phase, extra) => {
    trace.phases.push({ phase, at: Math.round(performance.now() - started), ...(extra || {}) })
    // Live trace: written on every phase so a run with no pilot selection can
    // still be audited from disk instead of only after finish().
    try {
      ctx.storage.set('bootTraceLive', trace)
    } catch (_) {}
  }

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id)
      if (!disposed) fn()
    }, ms)
    timers.add(id)
    return id
  }

  const playVoice = (rel) => {
    if (opts.sound === false) {
      mark('audio-muted', { file: rel })
      return null
    }
    try {
      stopVoice()
      const node = new Audio(media(rel))
      node.volume = 0.9
      activeAudio = node
      audio = node
      const played = node.play()
      if (played && played.catch) {
        played.catch((err) => mark('audio-rejected', { file: rel, name: String(err && err.name), message: String(err && err.message) }))
      }
      return node
    } catch (err) {
      mark('audio-error', { file: rel, error: String(err) })
      return null
    }
  }

  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      finish('escape')
      return
    }
    if (event.key === '1' || event.key === '2') {
      const pilot = PILOTS[Number(event.key) - 1]
      if (pilot && root.dataset.phase === 'select') choose(pilot)
    }
  }

  function finish(reason) {
    if (disposed) return
    disposed = true
    for (const id of timers) clearTimeout(id)
    timers.clear()
    for (const event of ['keydown']) document.removeEventListener(event, onKey, true)
    // A finished boot keeps its welcome clip playing; a skipped one cuts it.
    if (reason !== 'complete') stopVoice()
    audio = null
    const done = () => {
      root.remove()
      style.remove()
      trace.closedAt = new Date().toISOString()
      trace.durationMs = Math.round(performance.now() - started)
      trace.reason = reason
      try {
        ctx.storage.set('bootTrace', trace)
        sessionStorage.setItem(BOOT_SESSION_KEY, '1')
      } catch (_) {}
    }
    // Let the doors animate out, then unmount. A skipped boot leaves at once.
    // Raw timers here: the `timers` set is already cleared and `disposed` is
    // set, so the guarded `later()` helper would never fire.
    if (reason === 'complete') {
      root.classList.add('eva-boot-open')
      setTimeout(done, 700)
    } else {
      done()
    }
  }

  const stage = (child, fn) => {
    root.textContent = ''
    const layer = el('div', { class: 'eva-boot-stage' })
    if (child) layer.appendChild(child)
    root.appendChild(layer)
    if (fn) fn(layer)
  }

  const phaseGif = () => {
    root.dataset.phase = 'gif'
    const img = el('img', { class: 'eva-boot-img', src: media('anim/nerv-boot.gif'), alt: 'NERV' })
    img.addEventListener('load', () => mark('gif-loaded', { w: img.naturalWidth, h: img.naturalHeight }), { once: true })
    img.addEventListener('error', () => mark('gif-error'), { once: true })
    stage(img)
    later(phaseAlarm, 3400)
  }

  const phaseAlarm = () => {
    mark('alarm')
    root.dataset.phase = 'alarm'
    const img = el('img', { class: 'eva-boot-alarm', src: media('svg/nerv-emergency.svg'), alt: 'EMERGENCY' })
    img.addEventListener('error', () => mark('alarm-error'), { once: true })
    stage(img)
    later(phaseTyping, 2400)
  }

  const phaseTyping = () => {
    mark('typing')
    root.dataset.phase = 'typing'
    const line = el('div', { class: 'eva-boot-type' })
    const caret = el('span', { class: 'eva-boot-caret', text: ' ' })
    stage(el('div', null, line, caret))
    const text = copy.title
    let i = 0
    const tick = () => {
      if (disposed) return
      line.textContent = text.slice(0, ++i)
      if (i < text.length) later(tick, 90)
      else later(phaseSelect, 500)
    }
    later(tick, 200)
  }

  const phaseSelect = () => {
    mark('select')
    root.dataset.phase = 'select'
    const cards = el('div', { class: 'eva-boot-pilots' })
    for (const pilot of PILOTS) {
      const card = el(
        'div',
        {
          class: 'eva-boot-card',
          role: 'button',
          tabindex: '0',
          'data-pilot': pilot.id,
          style: 'border-color:' + pilot.accent + '55'
        },
        el('span', { class: 'n', text: pilot.number }),
        el('img', { src: media(pilot.avatar), alt: pilot.name }),
        el('span', { class: 'nm', text: pilot.name })
      )
      const activate = () => choose(pilot)
      card.addEventListener('click', activate)
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') activate()
      })
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = pilot.accent
        mark('hover', { pilot: pilot.id })
      })
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = pilot.accent + '55'
      })
      const img = card.querySelector('img')
      img.addEventListener('load', () => mark('avatar-loaded', { pilot: pilot.id, w: img.naturalWidth }), { once: true })
      img.addEventListener('error', () => mark('avatar-error', { pilot: pilot.id }), { once: true })
      cards.appendChild(card)
    }
    stage(cards)
    root.appendChild(el('div', { class: 'eva-boot-hint', text: copy.skip }))
    const first = cards.querySelector('.eva-boot-card')
    if (first) first.focus()
    // A boot that nobody answers must not hold the window hostage.
    later(() => {
      if (!disposed && root.dataset.phase === 'select') finish('timeout')
    }, 30000)
  }

  const choose = (pilot) => {
    if (disposed || root.dataset.phase !== 'select') return
    mark('chosen', { pilot: pilot.id })
    const reply = playVoice(pilot.select)
    let advanced = false
    const advance = () => {
      if (advanced || disposed) return
      advanced = true
      phaseSync(pilot)
    }
    if (reply) {
      reply.addEventListener('ended', advance, { once: true })
      reply.addEventListener('error', advance, { once: true })
      // Never hang on a clip that never reports an end.
      later(advance, 2600)
    } else {
      advance()
    }
  }

  const phaseSync = (pilot) => {
    if (disposed) return
    root.dataset.phase = 'sync'
    root.textContent = ''
    const bar = el('span', { style: 'background:' + pilot.accent })
    const label = el('div', { class: 'eva-boot-label', text: copy.sync + ' · ' + pilot.name })
    const box = el('div', { class: 'eva-boot-sync' }, el('div', { class: 'eva-boot-bar' }, bar), label)
    stage(box)
    const voice = playVoice(pilot.boot)
    const startedAt = performance.now()
    let total = 4200
    let running = false
    const run = () => {
      if (running || disposed) return
      running = true
      if (voice && Number.isFinite(voice.duration) && voice.duration > 0) total = voice.duration * 1000
      mark('sync-start', { totalMs: Math.round(total), durationKnown: Boolean(voice && Number.isFinite(voice.duration) && voice.duration > 0) })
      const step = () => {
        if (disposed) return
        const elapsed = performance.now() - startedAt
        const pct = Math.min(100, Math.round((elapsed / total) * 100))
        bar.style.width = pct + '%'
        if (pct < 100) later(step, 120)
        else {
          mark('sync-complete', { totalMs: Math.round(total) })
          phaseDoors(pilot)
        }
      }
      later(step, 120)
    }
    if (voice) {
      voice.addEventListener('loadedmetadata', run, { once: true })
      later(run, 900)
    } else {
      run()
    }
  }

  const phaseDoors = (pilot) => {
    mark('doors')
    root.dataset.phase = 'doors'
    root.textContent = ''
    root.appendChild(el('div', { class: 'eva-boot-door l' }))
    root.appendChild(el('div', { class: 'eva-boot-door r' }))
    later(() => {
      root.classList.add('eva-boot-open')
      mark('doors-open')
    }, 220)
    later(() => {
      playVoice(pilot.welcome)
      mark('welcome', { pilot: pilot.id })
      finish('complete')
    }, 1250)
  }

  try {
    if (opts.reducedMotion) {
      mark('reduced-motion')
      stage(null)
      phaseSelect()
    } else {
      phaseGif()
    }
    document.head.appendChild(style)
    document.body.appendChild(root)
    document.addEventListener('keydown', onKey, true)
    mark('mounted')
    return true
  } catch (err) {
    try {
      root.remove()
      style.remove()
    } catch (_) {}
    return false
  }
}

function shouldBoot(ctx) {
  if (performance.now() > BOOT_MAX_UPTIME_MS) return 'late-load'
  if (sessionStorage.getItem(BOOT_SESSION_KEY) === '1') return 'already-booted'
  if (ctx.storage.get('bootEnabled', true) === false) return 'disabled'
  return null
}

// ---------------------------------------------------------------------------
// plugin export
// ---------------------------------------------------------------------------

export default {
  id: PACKAGE_ID,
  name: 'EVA Theme',
  description: 'Evangelion dual-pilot theme: Asuka dark, Rei light, with pilot boot sequence.',
  defaultEnabled: true,
  register(ctx) {
    ctx.register({ id: 'theme', area: THEMES_AREA, data: EVA_THEME })

    // MAGI: docked to the right edge of the conversation. `placement` is the
    // semantic slot (the pane tabs with other right-hand panes); `dock` is the
    // explicit edge the reader sees on first install.
    ctx.register({
      id: 'magi',
      area: PANES_AREA,
      title: 'MAGI',
      data: { placement: 'right', dock: { pane: 'workspace', pos: 'right' } },
      render: () => h(MagiPane, { ctx })
    })

    ctx.register({
      id: 'status',
      area: STATUSBAR_AREAS.right,
      render: () => h(EvaChip, { ctx })
    })

    if (ctx.registerSettingsPage) {
      ctx.registerSettingsPage({
        id: 'settings',
        title: 'EVA',
        icon: 'dashboard',
        order: 40,
        render: () => h(EvaSettings, { ctx })
      })
    }

    // A pane that lands in a collapsed side is registered but invisible — the
    // host adopts contributed panes silently and never un-collapses the zone.
    // Reveal once, on the first load after install; afterwards the user's own
    // open/close wins.
    const paneId = PACKAGE_ID + ':magi'
    try {
      if (ctx.storage.get('paneRevealed') !== true && host.revealPane) {
        host.revealPane(paneId)
        ctx.storage.set('paneRevealed', true)
        ctx.storage.set('paneRevealedAt', new Date().toISOString())
      }
    } catch (err) {
      console.warn('[eva-theme] pane reveal failed', err)
    }

    ctx.register({
      id: 'boot',
      area: PALETTE_AREA,
      data: {
        id: PACKAGE_ID + '.boot',
        label: 'EVA: play the pilot boot sequence',
        keywords: ['eva', 'boot', 'nerv', 'asuka', 'rei'],
        run: () => {
          try {
            sessionStorage.removeItem(BOOT_SESSION_KEY)
          } catch (_) {}
          const settings = settingsOf(ctx)
          const ran = runBoot(ctx, {
            language: settings.language,
            reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            sound: settings.soundEnabled
          })
          if (!ran) host.notify({ kind: 'error', message: 'EVA boot overlay could not mount.' })
        }
      }
    })
    ctx.register({
      id: 'bootToggle',
      area: PALETTE_AREA,
      data: {
        id: PACKAGE_ID + '.boot-toggle',
        label: 'EVA: toggle the boot sequence on launch',
        keywords: ['eva', 'boot', 'toggle', 'disable'],
        run: () => {
          const next = ctx.storage.get('bootEnabled', true) === false
          ctx.storage.set('bootEnabled', next)
          host.notify({ kind: 'info', message: next ? 'EVA boot will play on the next launch.' : 'EVA boot disabled for launches.' })
        }
      }
    })
    ctx.register({
      id: 'apply',
      area: PALETTE_AREA,
      data: {
        id: PACKAGE_ID + '.apply',
        label: 'EVA: apply theme (Asuka dark / Rei light)',
        keywords: ['eva', 'theme', 'asuka', 'rei', 'nerv'],
        run: () => {
          if (!requestTheme(EVA_THEME.name)) {
            host.notify({ kind: 'error', message: 'EVA theme is not registered.' })
            return
          }
          host.notify({ kind: 'info', message: 'EVA theme applied. Dark = Asuka, light = Rei.' })
        }
      }
    })

    ctx.register({
      id: 'magiShow',
      area: PALETTE_AREA,
      data: {
        id: PACKAGE_ID + '.magi',
        label: 'EVA: show the MAGI pane',
        keywords: ['eva', 'magi', 'pane', 'hud', 'tps'],
        run: () => {
          if (!host.revealPane) {
            host.notify({ kind: 'error', message: 'This desktop build cannot reveal panes.' })
            return
          }
          host.revealPane(paneId)
        }
      }
    })

    ctx.onDispose(unmountSkin)
    mountSkin(ctx)

    // Load beacon: proves this module executed and both contributions landed.
    try {
      ctx.storage.set('lastLoad', new Date().toISOString())
      ctx.storage.set('themeName', EVA_THEME.name)
      ctx.storage.set('loadCount', (ctx.storage.get('loadCount', 0) || 0) + 1)
      ctx.storage.set('mediaBase', MEDIA_BASE)
      ctx.storage.set('moduleUrl', String(import.meta.url))
    } catch (err) {
      console.warn('[eva-theme] beacon failed', err)
    }

    // One-shot theme activation: the first load after install makes EVA the
    // active theme; afterwards the user's pick in Appearance always wins.
    try {
      if (ctx.storage.get('autoApplied') !== true && requestTheme(EVA_THEME.name)) {
        ctx.storage.set('autoApplied', true)
        ctx.storage.set('autoAppliedAt', new Date().toISOString())
      }
    } catch (err) {
      console.warn('[eva-theme] activation failed', err)
    }

    // Boot sequence: fresh app start only, once per window session.
    try {
      const skipReason = shouldBoot(ctx)
      if (skipReason) {
        ctx.storage.set('bootSkipped', { at: new Date().toISOString(), reason: skipReason })
      } else {
        const settings = settingsOf(ctx)
        const cleanup = runBoot(ctx, {
          language: settings.language,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          sound: settings.soundEnabled
        })
        if (cleanup) ctx.onDispose(() => {
          const node = document.querySelector('.eva-boot')
          if (node) node.remove()
          const style = document.getElementById(BOOT_STYLE_ID)
          if (style) style.remove()
          stopVoice()
        })
      }
    } catch (err) {
      ctx.storage.set('bootError', String(err))
    }
  }
}
