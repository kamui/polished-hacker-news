import { HEADER_LOGO, pageOp } from "./hn";

const HEADINGS: Record<string, string> = {
  news: "Top stories",
  newest: "Newest",
  front: "Past",
  ask: "Ask HN",
  show: "Show HN",
  jobs: "Jobs",
};

/**
 * Names the header's icon-only links, and keeps the karma HN prints beside the username as
 * "(<span id="karma">123</span>)", which the nav styling hides, as an attribute.
 */
export function keepKarma(): void {
  const me = document.querySelector<HTMLAnchorElement>("a#me");
  document.querySelector("a#logout")?.setAttribute("title", "Log out");
  document.querySelector(HEADER_LOGO)?.setAttribute("alt", "Hacker News");
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
    logo.src = chrome.runtime.getURL("icons/icon-96.png");
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

/**
 * HN lists a story's actions (hide, past, favorite) before its comment count. They go after
 * it, with hide last, so the count sits beside the age and Tab follows the line as drawn.
 */
export function orderSublines(): void {
  for (const line of document.querySelectorAll(".subline")) {
    const hide = line.querySelector(':scope > a[href^="hide?"]');
    line.append(...line.querySelectorAll(':scope > :is(a.hnpast, a[href^="fave?"], a[href^="flag?"], a[href^="vouch?"])'));
    if (hide) line.append(hide);
  }
}

/** Gives the thread's comment box a placeholder, which the stylesheet uses to keep it one line tall until it is used. */
export function labelCommentBox(): void {
  document.querySelector('.fatitem form[action="comment"] textarea')?.setAttribute("placeholder", "Add a comment…");
}

const BARE_NAV: [string, string][] = [
  ["newest", "New"],
  ["front", "Past"],
  ["newcomments", "Comments"],
  ["ask", "Ask"],
  ["show", "Show"],
  ["jobs", "Jobs"],
  ["submit", "Submit"],
];

/**
 * Login and message pages ("No such item.") come with no header at all. Login gets the mark
 * and a link home above its form; a message page gets a header bar like every other page's,
 * with HN's nav links, which the search and settings buttons then join.
 */
export function addHomeLink(): void {
  if (document.documentElement.hasAttribute("op") || document.querySelector("body > center")) return;
  const home = document.createElement("a");
  home.className = "phn-home";
  home.href = "news";
  home.textContent = "Hacker News";
  if (document.querySelector("body > form")) {
    document.body.prepend(home);
    return;
  }
  const nav = document.createElement("nav");
  nav.className = "phn-bare-nav";
  for (const [href, label] of BARE_NAV) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    nav.append(link);
  }
  const bar = document.createElement("header");
  bar.className = "phn-bare-header";
  bar.append(home, nav);
  document.body.prepend(bar);
}

/** On a phone, the sticky header's nav row gives way while reading down the page and returns on any scroll up. */
export function hideNavOnScroll(): void {
  const phone = matchMedia("(max-width: 640px)");
  const root = document.documentElement;
  let last = scrollY;
  addEventListener(
    "scroll",
    () => {
      const delta = scrollY - last;
      // Ignores small movements, so a finger resting on the screen doesn't flicker the row.
      if (Math.abs(delta) < 8) return;
      last = scrollY;
      root.toggleAttribute("data-phn-nav-away", phone.matches && delta > 0 && scrollY > 100);
    },
    { passive: true },
  );
}

/**
 * Drops the "Hacker News" wordmark from the header when there is no room for it: on a wide
 * screen when the nav would otherwise scroll, and on a phone, where the name sits on the top
 * row beside the account links, when it would run into them (a long username, say). Also
 * flags when the nav scrolls, so the stylesheet can fade its edge only then.
 */
export function fitHeader(): void {
  const nav = document.querySelector<HTMLElement>("#hnmain > tbody > tr:first-child > td > table > tbody > tr > td:nth-child(2)");
  const account = nav?.nextElementSibling;
  const links = nav?.querySelector<HTMLElement>(".pagetop");
  const word = nav?.querySelector<HTMLElement>(".hnname");
  if (!nav || !links || !word) return;
  const root = document.documentElement;
  // Matches the header stylesheet's two-row layout.
  const phone = matchMedia("(max-width: 640px)");
  const row = nav.parentElement ?? nav;
  // Measured while shown, so deciding never needs to show it again, which would resize the nav and loop.
  let wordWidth = 0;
  let wordEnd = 0;
  const fit = () => {
    const tight = root.hasAttribute("data-phn-tight");
    if (!tight) {
      const box = word.getBoundingClientRect();
      wordWidth = box.width + parseFloat(getComputedStyle(word).marginRight);
      wordEnd = box.right - row.getBoundingClientRect().left;
    }
    let next: boolean;
    if (phone.matches) {
      const room = account ? account.getBoundingClientRect().left - row.getBoundingClientRect().left : Infinity;
      next = wordEnd + 8 > room;
    } else {
      next = nav.scrollWidth + (tight ? wordWidth : 0) > nav.clientWidth + 1;
    }
    if (next !== tight) root.toggleAttribute("data-phn-tight", next);
    root.toggleAttribute("data-phn-nav-scrolls", nav.scrollWidth > nav.clientWidth + 1);
  };
  const observer = new ResizeObserver(fit);
  observer.observe(nav);
  observer.observe(links);
  if (account) observer.observe(account);
}
