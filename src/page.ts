import { HEADER_LOGO, pageOp } from "./hn";

const HEADINGS: Record<string, string> = {
  news: "Top stories",
  newest: "Newest",
  front: "Past",
  ask: "Ask HN",
  show: "Show HN",
  jobs: "Jobs",
};

/** HN prints karma beside the username as "(<span id="karma">123</span>)", which the nav styling hides; keep it as an attribute. */
export function keepKarma(): void {
  const me = document.querySelector<HTMLAnchorElement>("a#me");
  document.querySelector("a#logout")?.setAttribute("title", "Log out");
  const karma = document.getElementById("karma")?.textContent?.trim();
  if (me && karma) me.dataset.phnKarma = karma;
}

let siteIcons: Element[] | undefined;
let siteLogo: string | undefined;

/**
 * Shows the polish tin as the tab icon, at the two sizes browsers draw tabs with, and as the
 * header logo; or puts back the icon links and logo HN's own page came with.
 */
export function setTinIcon(own: boolean): void {
  if (own === (siteIcons !== undefined)) return;
  const logo = document.querySelector<HTMLImageElement>(HEADER_LOGO);
  const shown = [...document.querySelectorAll('link[rel~="icon"]')];
  for (const link of shown) link.remove();
  if (!own) {
    document.head.append(...(siteIcons ?? []));
    if (logo && siteLogo) logo.src = siteLogo;
    siteIcons = undefined;
    return;
  }
  siteIcons = shown;
  for (const size of [16, 32]) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("sizes", `${size}x${size}`);
    link.href = chrome.runtime.getURL(`icons/icon-${size}.png`);
    document.head.append(link);
  }
  if (logo) {
    siteLogo = logo.src;
    logo.src = chrome.runtime.getURL("icons/icon-48.png");
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

/** Gives the thread's comment box a placeholder, which the stylesheet uses to keep it one line tall until it is used. */
export function labelCommentBox(): void {
  document.querySelector('.fatitem form[action="comment"] textarea')?.setAttribute("placeholder", "Add a comment…");
}

/** Login and message pages come with no header at all; this gives them the mark and a way back to the front page. */
export function addHomeLink(): void {
  if (document.documentElement.hasAttribute("op") || document.querySelector("body > center")) return;
  const home = document.createElement("a");
  home.className = "phn-home";
  home.href = "news";
  home.textContent = "Hacker News";
  document.body.prepend(home);
}

/** Drops the "Hacker News" wordmark from the header whenever the nav would otherwise scroll, as with a long username. */
export function fitHeader(): void {
  const nav = document.querySelector<HTMLElement>("#hnmain > tbody > tr:first-child > td > table > tbody > tr > td:nth-child(2)");
  if (!nav) return;
  const links = nav.querySelector<HTMLElement>(".pagetop");
  const word = nav.querySelector<HTMLElement>(".hnname");
  if (!links || !word) return;
  const root = document.documentElement;
  // On a phone the nav has a scrolling row of its own (see the header stylesheet), so overflow there is expected.
  const phone = matchMedia("(max-width: 640px)");
  // Measured while shown, so deciding never needs to show it again, which would resize the nav and loop.
  let wordWidth = 0;
  const fit = () => {
    const tight = root.hasAttribute("data-phn-tight");
    if (!tight) wordWidth = word.getBoundingClientRect().width + parseFloat(getComputedStyle(word).marginRight);
    const needed = nav.scrollWidth + (tight ? wordWidth : 0);
    const next = !phone.matches && needed > nav.clientWidth + 1;
    if (next !== tight) root.toggleAttribute("data-phn-tight", next);
  };
  const observer = new ResizeObserver(fit);
  observer.observe(nav);
  observer.observe(links);
}
