import settingsIcon from "lucide-static/icons/settings-2.svg" with { type: "text" };
import { attachPopover, headerEndCell, placeInHeader } from "./popover";
import {
  RANGES,
  type RangeKey,
  type Settings,
  THEMES,
  type Theme,
  activeTheme,
  withPickedTheme,
} from "./settings";

type ToggleKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

const THEME_NAMES: Record<Theme, string> = {
  light: "Light",
  classic: "Classic",
  slate: "Slate",
  dark: "Dark",
  black: "Black",
};

const THEME_SWATCHES: Record<Theme, string> = {
  light: "#ffffff",
  classic: "#f6f6ef",
  slate: "#1c232f",
  dark: "#17181b",
  black: "#000000",
};

const RANGE_LABELS: Record<RangeKey, { label: string; format: (value: number) => string }> = {
  fontSize: { label: "Text size", format: (v) => `${v}px` },
  lineHeight: { label: "Line spacing", format: (v) => v.toFixed(2) },
  width: { label: "Page width", format: (v) => `${v}px` },
};

/** Chrome only honours -webkit-font-smoothing on macOS; elsewhere the OS decides and the toggle would do nothing. */
const canSmoothFonts = navigator.userAgent.includes("Macintosh");

const TOGGLES: ReadonlyArray<readonly [ToggleKey, string]> = [
  ["stickyHeader", "Keep the header in view"],
  ["newTab", "Open links in a new tab"],
  ...(canSmoothFonts ? ([["smoothing", "Smooth fonts"]] as const) : []),
  ["dimRead", "Dim stories I've opened"],
  ["markNew", "Mark new comments"],
  ["tinIcon", "Use the polish tin icon"],
];

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

export interface Panel {
  render(settings: Settings): void;
}

export function mountPanel(
  initial: Settings,
  onChange: (next: Settings) => void,
  onDisable: () => void,
): Panel {
  let settings = initial;
  const renderers: Array<(s: Settings) => void> = [];
  const change = (next: Settings) => {
    settings = next;
    render(next);
    onChange(next);
  };
  const render = (s: Settings) => {
    settings = s;
    for (const draw of renderers) draw(s);
  };

  const fonts = el("div", { className: "phn-fonts" });
  for (const font of ["sans", "serif"] as const) {
    const button = el("button", { type: "button" }, [
      font === "sans" ? "Sans" : "Serif",
      el("b", { textContent: "Aa", ariaHidden: "true" }),
    ]);
    button.dataset.font = font;
    button.addEventListener("click", () => change({ ...settings, font }));
    renderers.push((s) => button.setAttribute("aria-pressed", String(s.font === font)));
    fonts.append(button);
  }

  const ranges = (Object.keys(RANGES) as RangeKey[]).map((key) => {
    const { min, max, step } = RANGES[key];
    const { label, format } = RANGE_LABELS[key];
    const output = el("output");
    const input = el("input", { type: "range", min: String(min), max: String(max), step: String(step) });
    input.setAttribute("aria-label", label);
    input.addEventListener("input", () => change({ ...settings, [key]: Number(input.value) }));
    renderers.push((s) => {
      input.value = String(s[key]);
      input.style.setProperty("--phn-fill", `${((s[key] - min) / (max - min)) * 100}%`);
      output.textContent = format(s[key]);
    });
    return el("label", { className: "phn-range" }, [label, output, input]);
  });

  const themeName = el("span");
  const swatches = el("div", { className: "phn-swatches" });
  for (const theme of THEMES) {
    const button = el("button", { type: "button", title: THEME_NAMES[theme] });
    button.setAttribute("aria-label", `${THEME_NAMES[theme]} theme`);
    button.style.setProperty("--phn-swatch", THEME_SWATCHES[theme]);
    button.addEventListener("click", () => change(withPickedTheme(settings, theme)));
    // The label beside "Theme" names the swatch under the pointer or focus, then the chosen one again.
    for (const type of ["pointerenter", "focus"]) {
      button.addEventListener(type, () => (themeName.textContent = THEME_NAMES[theme]));
    }
    for (const type of ["pointerleave", "blur"]) {
      button.addEventListener(type, () => (themeName.textContent = THEME_NAMES[currentTheme(settings)]));
    }
    renderers.push((s) => button.setAttribute("aria-pressed", String(currentTheme(s) === theme)));
    swatches.append(button);
  }
  renderers.push((s) => (themeName.textContent = THEME_NAMES[currentTheme(s)]));

  const switchFor = (key: ToggleKey, label: string) => {
    const button = el("button", { type: "button", className: "phn-switch", role: "switch" }, [
      label,
      el("i"),
    ]);
    button.addEventListener("click", () => change({ ...settings, [key]: !settings[key] }));
    renderers.push((s) => button.setAttribute("aria-checked", String(s[key])));
    return button;
  };

  const original = el("button", { type: "button", textContent: "Show the original design" });
  original.addEventListener("click", onDisable);

  const panel = el("div", { className: "phn-panel", hidden: true, role: "dialog" }, [
    fonts,
    ...ranges,
    el("div", { className: "phn-group" }, [
      el("div", { className: "phn-group-label" }, ["Theme", themeName]),
      swatches,
      switchFor("matchSystem", "Match my system's light or dark"),
    ]),
    el("div", { className: "phn-group" }, TOGGLES.map(([key, label]) => switchFor(key, label))),
    el("div", { className: "phn-foot" }, [
      original,
      `${chrome.runtime.getManifest().short_name} ${chrome.runtime.getManifest().version}`,
    ]),
  ]);
  panel.setAttribute("aria-label", "Reading settings");

  const toggleButton = el("button", { type: "button", className: "phn-icon-btn phn-settings-btn" });
  toggleButton.innerHTML = settingsIcon;
  toggleButton.append(el("span", { textContent: chrome.runtime.getManifest().short_name ?? "" }));
  toggleButton.title = "Reading settings";
  toggleButton.setAttribute("aria-label", "Reading settings");
  attachPopover(toggleButton, panel);

  if (!placeInHeader(toggleButton)) {
    toggleButton.classList.add("phn-floating");
    document.body.append(toggleButton);
  }
  document.body.append(panel);
  render(initial);
  return { render };
}

function currentTheme(s: Settings): Theme {
  return activeTheme(s, matchMedia("(prefers-color-scheme: dark)").matches);
}

/** Shown in place of the settings button while the restyle is off; one click brings it back. */
export function mountRestoreLink(onEnable: () => void): void {
  const button = el("button", { type: "button", className: "phn-settings-btn" });
  button.textContent = chrome.runtime.getManifest().short_name ?? "";
  button.title = "Switch the restyle back on";
  button.addEventListener("click", onEnable);
  (headerEndCell() ?? document.body).append(button);
}
