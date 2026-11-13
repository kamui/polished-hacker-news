export const THEMES = ["light", "classic", "slate", "dark", "black"] as const;
export type Theme = (typeof THEMES)[number];

export const FONTS = ["sans", "serif"] as const;
export type Font = (typeof FONTS)[number];

export interface Settings {
  enabled: boolean;
  theme: Theme;
  lightTheme: Theme;
  matchSystem: boolean;
  font: Font;
  fontSize: number;
  lineHeight: number;
  width: number;
  stickyHeader: boolean;
  newTab: boolean;
  smoothing: boolean;
  dimRead: boolean;
  markNew: boolean;
}

export const DEFAULTS: Readonly<Settings> = {
  enabled: true,
  theme: "black",
  lightTheme: "light",
  matchSystem: false,
  font: "sans",
  fontSize: 16,
  lineHeight: 1.5,
  width: 820,
  stickyHeader: true,
  newTab: true,
  smoothing: false,
  dimRead: true,
  markNew: true,
};

export const RANGES = {
  fontSize: { min: 13, max: 21, step: 0.5 },
  lineHeight: { min: 1.25, max: 1.9, step: 0.05 },
  width: { min: 560, max: 1280, step: 20 },
} as const satisfies Partial<Record<keyof Settings, { min: number; max: number; step: number }>>;

export type RangeKey = keyof typeof RANGES;

const LIGHT_THEMES: ReadonlySet<Theme> = new Set(["light", "classic"]);

function oneOf<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clamp(key: RangeKey, value: unknown): number {
  const { min, max } = RANGES[key];
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : DEFAULTS[key];
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseSettings(raw: unknown): Settings {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    enabled: flag(r.enabled, DEFAULTS.enabled),
    theme: oneOf(THEMES, r.theme, DEFAULTS.theme),
    lightTheme: oneOf(THEMES, r.lightTheme, DEFAULTS.lightTheme),
    matchSystem: flag(r.matchSystem, DEFAULTS.matchSystem),
    font: oneOf(FONTS, r.font, DEFAULTS.font),
    fontSize: clamp("fontSize", r.fontSize),
    lineHeight: clamp("lineHeight", r.lineHeight),
    width: clamp("width", r.width),
    stickyHeader: flag(r.stickyHeader, DEFAULTS.stickyHeader),
    newTab: flag(r.newTab, DEFAULTS.newTab),
    smoothing: flag(r.smoothing, DEFAULTS.smoothing),
    dimRead: flag(r.dimRead, DEFAULTS.dimRead),
    markNew: flag(r.markNew, DEFAULTS.markNew),
  };
}

export function activeTheme(s: Settings, systemPrefersDark: boolean): Theme {
  return s.matchSystem && !systemPrefersDark ? s.lightTheme : s.theme;
}

/** With "match system" on, a picked theme fills the slot for the scheme it belongs to. */
export function withPickedTheme(s: Settings, theme: Theme): Settings {
  if (s.matchSystem && LIGHT_THEMES.has(theme)) return { ...s, lightTheme: theme };
  return { ...s, theme };
}

const MIRROR_KEY = "phn:settings";
const SYNC_KEY = "settings";

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

/** localStorage copy, readable synchronously at document_start so the first paint is already themed. */
export function readMirror(): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(MIRROR_KEY) ?? "null"));
  } catch {
    return { ...DEFAULTS };
  }
}

function writeMirror(s: Settings): void {
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(s));
  } catch {
    // Storage can be blocked; the synced copy still applies a moment later.
  }
}

export function applySettings(s: Settings): void {
  const root = document.documentElement;
  root.classList.toggle("phn", s.enabled);
  const d = root.dataset;
  d.phnTheme = activeTheme(s, systemDark());
  d.phnFont = s.font;
  d.phnSticky = String(s.stickyHeader);
  d.phnSmooth = String(s.smoothing);
  d.phnDim = String(s.dimRead);
  d.phnNew = String(s.markNew);
  root.style.setProperty("--phn-size", `${s.fontSize}px`);
  root.style.setProperty("--phn-leading", String(s.lineHeight));
  root.style.setProperty("--phn-width", `${s.width}px`);
}

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(SYNC_KEY);
  const s = parseSettings(stored[SYNC_KEY]);
  writeMirror(s);
  return s;
}

let unsaved: Settings | undefined;
let pendingSync: ReturnType<typeof setTimeout> | undefined;

/** Writes any change still waiting on the debounce; call before the page goes away. */
export async function flushSettings(): Promise<void> {
  clearTimeout(pendingSync);
  const s = unsaved;
  unsaved = undefined;
  if (s) await chrome.storage.sync.set({ [SYNC_KEY]: s });
}

/** chrome.storage.sync allows 120 writes a minute, which a dragged slider would exceed. */
export function saveSettings(s: Settings): void {
  writeMirror(s);
  unsaved = s;
  clearTimeout(pendingSync);
  pendingSync = setTimeout(() => void flushSettings(), 400);
}

export function onSettingsChanged(listener: (s: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    const change = changes[SYNC_KEY];
    if (area !== "sync" || !change) return;
    const s = parseSettings(change.newValue);
    writeMirror(s);
    listener(s);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => listener(readMirror()));
}
