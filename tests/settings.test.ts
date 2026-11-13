import { describe, expect, test } from "bun:test";
import { DEFAULTS, type Settings, activeTheme, parseSettings, withPickedTheme } from "../src/settings";

describe("parseSettings", () => {
  test("fills in defaults for missing or malformed storage", () => {
    expect(parseSettings(undefined)).toEqual(DEFAULTS);
    expect(parseSettings("nonsense")).toEqual(DEFAULTS);
    expect(parseSettings({ theme: "neon", font: 7, newTab: "yes" })).toEqual(DEFAULTS);
  });

  test("keeps valid stored values, so an update never resets a reader's choices", () => {
    const stored: Settings = { ...DEFAULTS, theme: "slate", font: "serif", fontSize: 18, newTab: false };
    expect(parseSettings(stored)).toEqual(stored);
  });

  test("keeps settings saved by a version that had fewer options", () => {
    expect(parseSettings({ theme: "dark", fontSize: 14 })).toEqual({ ...DEFAULTS, theme: "dark", fontSize: 14 });
  });

  test("clamps numbers to the slider ranges", () => {
    const parsed = parseSettings({ fontSize: 400, lineHeight: 0, width: Number.NaN });
    expect(parsed.fontSize).toBe(21);
    expect(parsed.lineHeight).toBe(1.25);
    expect(parsed.width).toBe(DEFAULTS.width);
  });
});

describe("themes with match-system", () => {
  const auto: Settings = { ...DEFAULTS, matchSystem: true, theme: "black", lightTheme: "classic" };

  test("follows the system scheme only when asked to", () => {
    expect(activeTheme(auto, true)).toBe("black");
    expect(activeTheme(auto, false)).toBe("classic");
    expect(activeTheme({ ...auto, matchSystem: false }, false)).toBe("black");
  });

  test("a picked theme fills the slot for its own scheme", () => {
    expect(withPickedTheme(auto, "light")).toMatchObject({ lightTheme: "light", theme: "black" });
    expect(withPickedTheme(auto, "slate")).toMatchObject({ lightTheme: "classic", theme: "slate" });
    expect(withPickedTheme({ ...auto, matchSystem: false }, "light")).toMatchObject({ theme: "light" });
  });
});
