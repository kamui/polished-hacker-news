import { pageOp } from "./hn";

const HEADINGS: Record<string, string> = {
  news: "Top stories",
  newest: "Newest",
  ask: "Ask HN",
  show: "Show HN",
  jobs: "Jobs",
};

/** HN prints karma beside the username as "(<span id="karma">123</span>)", which the nav styling hides; keep it as an attribute. */
export function keepKarma(): void {
  const me = document.querySelector<HTMLAnchorElement>("a#me");
  const karma = document.getElementById("karma")?.textContent?.trim();
  if (me && karma) me.dataset.phnKarma = karma;
}

/** Swaps HN's tab icon for the extension's, at the two sizes browsers draw tabs with. */
export function useOwnFavicon(): void {
  for (const link of document.querySelectorAll('link[rel~="icon"]')) link.remove();
  for (const size of [16, 32]) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("sizes", `${size}x${size}`);
    link.href = chrome.runtime.getURL(`icons/icon-${size}.png`);
    document.head.append(link);
  }
}

const DOWN_KEY = "phn:down";

/**
 * Comments get a second vote arrow only for readers with downvote rights, and the action row
 * needs room for it. Remembered between pages so the row is laid out right from first paint.
 */
export function applyDownvoteSlot(): void {
  try {
    document.documentElement.toggleAttribute("data-phn-down", localStorage.getItem(DOWN_KEY) === "1");
  } catch {
    // Storage can be blocked; the row then starts with room for one arrow.
  }
}

export function rememberDownvoteSlot(): void {
  if (!document.querySelector("tr.comtr")) return;
  try {
    localStorage.setItem(DOWN_KEY, document.querySelector('tr.comtr a[id^="down_"]') ? "1" : "0");
  } catch {
    return;
  }
  applyDownvoteSlot();
}

export function addListHeading(): void {
  const title = HEADINGS[pageOp()];
  const list = document.querySelector("#bigbox > td > table");
  if (!title || !list || !list.querySelector("tr.athing.submission")) return;

  const heading = document.createElement("div");
  heading.className = "phn-heading";
  const h1 = document.createElement("h1");
  h1.textContent = title;
  heading.append(h1);
  if (pageOp() === "news" && !location.search) {
    const today = document.createElement("time");
    today.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    heading.append(today);
  }
  list.parentElement?.prepend(heading);
}
