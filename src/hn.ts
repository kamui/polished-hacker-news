/** Selectors and readers for Hacker News's own markup, kept in one place because HN changes it without notice. */

export const AUTHOR_LINK = ':is(.comhead, .subline) > a[href^="user?id="]';

export const pageOp = () => document.documentElement.getAttribute("op") ?? "";

export const isItemPage = () => location.pathname === "/item";

export function storyIdFromUrl(): string | undefined {
  const id = new URLSearchParams(location.search).get("id");
  return id && /^\d+$/.test(id) ? id : undefined;
}

export const commentRows = () =>
  Array.from(document.querySelectorAll<HTMLTableRowElement>("tr.athing.comtr"));

export const storyRows = () =>
  Array.from(document.querySelectorAll<HTMLTableRowElement>("tr.athing.submission"));

const depths = new WeakMap<Element, number>();

export function depthOf(row: Element): number {
  let depth = depths.get(row);
  if (depth === undefined) {
    depth = Number(row.querySelector("td.ind")?.getAttribute("indent")) || 0;
    depths.set(row, depth);
  }
  return depth;
}

export function nextComment(row: Element): HTMLTableRowElement | null {
  let el = row.nextElementSibling;
  while (el && !el.classList.contains("comtr")) el = el.nextElementSibling;
  return el as HTMLTableRowElement | null;
}

export function previousComment(row: Element): HTMLTableRowElement | null {
  let el = row.previousElementSibling;
  while (el && !el.classList.contains("comtr")) el = el.previousElementSibling;
  return el as HTMLTableRowElement | null;
}

/** The enclosing comment at the given depth, walking up from a deeper comment. */
export function ancestorAt(row: HTMLTableRowElement, depth: number): HTMLTableRowElement | null {
  let el: HTMLTableRowElement | null = row;
  while (el && depthOf(el) > depth) el = previousComment(el);
  return el && depthOf(el) === depth ? el : null;
}

/** The row for a story's points, author and comment links: always the row right after the story's. */
export const subtextRow = (story: Element) => story.nextElementSibling;

export function parseCount(text: string | null | undefined): number | undefined {
  const match = text?.replace(/ /g, " ").match(/(\d+)\s+comment/);
  return match ? Number(match[1]) : undefined;
}

export function commentsLink(story: Element): HTMLAnchorElement | undefined {
  const links = subtextRow(story)?.querySelectorAll<HTMLAnchorElement>('.subline > a[href^="item?id="]');
  return links ? Array.from(links).at(-1) : undefined;
}

export const loggedInUser = () => document.querySelector("a#me")?.textContent ?? undefined;
