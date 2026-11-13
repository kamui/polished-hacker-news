import { describe, expect, test } from "bun:test";
import { parseCount } from "../src/hn";
import { expiredKeys } from "../src/stories";

describe("parseCount", () => {
  test("reads HN's comment link text, which uses a non-breaking space", () => {
    expect(parseCount("210 comments")).toBe(210);
    expect(parseCount("1 comment")).toBe(1);
    expect(parseCount("578 points by zulln 1 hour ago | hide | 249 comments")).toBe(249);
  });

  test("has no count for a story nobody has discussed", () => {
    expect(parseCount("discuss")).toBeUndefined();
    expect(parseCount(null)).toBeUndefined();
  });
});

describe("expiredKeys", () => {
  const day = 24 * 3600;
  const now = 1_800_000_000;

  test("drops stories not visited in 120 days and unreadable records, and nothing else", () => {
    const all = {
      "s:1": { t: now - 10 * day, m: 5, c: 2 },
      "s:2": { t: now - 121 * day },
      "s:3": "corrupt",
      prunedAt: now - 500 * day,
    };
    expect(expiredKeys(all, now).sort()).toEqual(["s:2", "s:3"]);
  });
});
