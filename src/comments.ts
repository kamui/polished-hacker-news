import arrowDown from "lucide-static/icons/arrow-down.svg" with { type: "text" };
import arrowUp from "lucide-static/icons/arrow-up.svg" with { type: "text" };
import {
  AUTHOR_LINK,
  ancestorAt,
  commentRows,
  depthOf,
  loggedInUser,
  nextComment,
} from "./hn";

export interface CommentSummary {
  maxId: number;
}

/**
 * Flags comments that arrived since `seenUpTo`, the highest comment id on the reader's last
 * visit. HN ids only ever increase, so a larger id means a later comment.
 */
export function markNewComments(seenUpTo: number | undefined): CommentSummary {
  const me = loggedInUser();
  let maxId = 0;
  for (const row of commentRows()) {
    const id = Number(row.id);
    if (!(id > 0)) continue;
    if (id > maxId) maxId = id;
    if (seenUpTo === undefined || id <= seenUpTo) continue;
    if (me && row.querySelector(AUTHOR_LINK)?.textContent === me) continue;
    row.dataset.phnNew = "";
  }
  return { maxId };
}

export function markStoryAuthor(): void {
  const author = document.querySelector(`.fatitem ${AUTHOR_LINK}`)?.getAttribute("href");
  if (!author) return;
  for (const link of document.querySelectorAll(`.comment-tree .comhead > a[href=${JSON.stringify(author)}]`)) {
    link.classList.add("phn-op");
  }
}

/**
 * Puts each comment's controls in the DOM in the order they appear on screen, so Tab goes
 * collapse, author, links, then the vote arrows and Reply under the text. The stylesheet
 * draws the toggle and arrows in the same place before and after the move. Also marks the
 * "parent" link, which stays on show while the other nav links wait for hover.
 */
export function prepareCommentControls(): void {
  for (const row of commentRows()) {
    const toggle = row.querySelector("a.togg");
    if (toggle) row.querySelector(".comhead")?.prepend(toggle);
    const votes = row.querySelector("td.votelinks > center");
    const reply = row.querySelector(".reply");
    if (votes && reply?.querySelector("p a")) reply.prepend(votes);
    else if (votes && reply) {
      // HN holds back Reply on some fresh deep comments; a row with only the arrow left isn't worth its height.
      row.querySelector(".comhead > .age")?.after(votes);
      reply.classList.add("phn-gone");
    }
    const links = [...row.querySelectorAll(".navs > a.clicky:not(.togg)")];
    for (const link of links) {
      if (link.textContent?.trim() !== "parent") continue;
      link.classList.add("phn-parent");
      // First among the links, so the hidden ones (root, prev, next) don't hold a gap open before it.
      link.parentElement?.prepend(link);
    }
    nameToggle(row);
  }
}

/** HN's toggle reads "[–]"; name it for what it does, counting the replies it folds (HN's `n` includes the comment). */
function nameToggle(row: Element): void {
  const toggle = row.querySelector("a.togg");
  if (!toggle) return;
  const replies = Number(toggle.getAttribute("n")) - 1;
  const what = replies > 0 ? `comment and ${replies === 1 ? "1 reply" : `${replies} replies`}` : "comment";
  toggle.setAttribute("aria-label", `${row.classList.contains("coll") ? "Expand" : "Collapse"} ${what}`);
}

/** Says how many replies a collapsed comment hides. */
function labelCollapsed(row: Element): void {
  const replies = Number(row.querySelector("a.togg")?.getAttribute("n")) - 1;
  if (!(replies > 0)) return;
  row.querySelector(".navs")?.setAttribute("data-phn-label", replies === 1 ? "1 reply hidden" : `${replies} replies hidden`);
}

function toggle(row: HTMLTableRowElement): void {
  row.querySelector<HTMLAnchorElement>("a.togg")?.click();
  if (row.getBoundingClientRect().top < 0) row.scrollIntoView({ block: "start" });
}

/** The comment a thread rail under the pointer belongs to: an ancestor's line, or the row's own gutter. */
function railOwner(target: Element, clientX: number): HTMLTableRowElement | null {
  const row = target.closest<HTMLTableRowElement>("tr.comtr");
  if (!row) return null;
  if (target.closest("a.togg")) return row;

  const indent = target.closest<HTMLElement>("td.ind");
  const depth = depthOf(row);
  if (!indent || depth === 0) return null;
  const box = indent.getBoundingClientRect();
  if (box.width === 0) return null;
  const level = Math.min(depth - 1, Math.max(0, Math.floor(((clientX - box.left) / box.width) * depth)));
  return ancestorAt(row, level);
}

let hotRails: HTMLElement[] = [];
let hotRoot: HTMLTableRowElement | null = null;

/**
 * Lights the rail of one thread through all its replies. The class and position go on each
 * reply's indent cell, which has no children, so the style work stays proportional to the
 * thread and never touches comment text.
 */
function highlightThread(root: HTMLTableRowElement | null): void {
  if (root === hotRoot) return;
  hotRoot?.classList.remove("phn-hot-root");
  for (const rail of hotRails) rail.classList.remove("phn-hot", "phn-hot-child");
  hotRails = [];
  hotRoot = root;
  if (!root) return;

  const depth = depthOf(root);
  root.classList.add("phn-hot-root");
  for (let row = nextComment(root); row && depthOf(row) > depth; row = nextComment(row)) {
    const rail = row.querySelector<HTMLElement>("td.ind");
    if (!rail) continue;
    rail.style.setProperty("--phn-hot", String(depth));
    rail.classList.add("phn-hot");
    rail.classList.toggle("phn-hot-child", depthOf(row) === depth + 1);
    hotRails.push(rail);
  }
}

export function initThreadControls(): void {
  for (const row of document.querySelectorAll("tr.comtr.coll")) labelCollapsed(row);

  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const toggled = event.target.closest("a.togg")?.closest("tr.comtr");
      if (toggled) {
        labelCollapsed(toggled);
        // Capture phase runs before HN's own handler flips the row's state.
        setTimeout(() => nameToggle(toggled));
        return;
      }
      const owner = event.target.closest("td.ind") && railOwner(event.target, event.clientX);
      if (owner) {
        event.preventDefault();
        toggle(owner);
        return;
      }
      const collapsed = event.target.closest<HTMLTableRowElement>("tr.comtr.coll");
      if (collapsed && !event.target.closest("a, button")) toggle(collapsed);
    },
    true,
  );

  // Mouse only: a tap fires these too, and nothing afterwards would clear the highlight.
  document.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" || !(event.target instanceof Element)) return;
    highlightThread(event.target.closest("td.ind, a.togg") ? railOwner(event.target, event.clientX) : null);
  });
  document.addEventListener("pointermove", (event) => {
    if (event.pointerType === "mouse" && event.target instanceof Element && event.target.closest("td.ind")) {
      highlightThread(railOwner(event.target, event.clientX));
    }
  });
}

/** A floating control (and the n / Shift+N keys) that steps through comments new since the last visit. */
export function initNewCommentNav(): void {
  const fresh = () =>
    Array.from(document.querySelectorAll<HTMLTableRowElement>("tr.comtr[data-phn-new]")).filter(
      (row) => row.offsetParent !== null,
    );
  // Counted the way the stepping counts them: new comments inside a collapsed thread can't be stepped to.
  const newCount = fresh().length;
  if (newCount === 0) return;
  document.documentElement.toggleAttribute("data-phn-pill", true);

  let last: HTMLTableRowElement | undefined;
  let lastAt = 0;

  const jump = (direction: 1 | -1) => {
    const rows = fresh();
    if (rows.length === 0) return;
    // Where scrollIntoView leaves a row's top: the page's scroll padding, which clears the sticky header.
    const line = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const index = last ? rows.indexOf(last) : -1;
    // A smooth scroll is still moving the last target, so its position can't tell us where we are yet.
    const scrolling = index !== -1 && performance.now() - lastAt < 800;
    const at = scrolling
      ? index + direction
      : direction === 1
        ? rows.findIndex((row) => row.getBoundingClientRect().top > line + 4)
        : rows.findLastIndex((row) => row.getBoundingClientRect().top < line - 4);
    const wrapped = at < 0 || at >= rows.length ? (direction === 1 ? 0 : rows.length - 1) : at;
    const target = rows[wrapped];
    if (!target) return;
    last?.classList.remove("phn-current");
    target.classList.add("phn-current");
    last = target;
    lastAt = performance.now();
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    target.classList.remove("phn-flash");
    void target.offsetWidth;
    target.classList.add("phn-flash");
    label.textContent = `${wrapped + 1} of ${rows.length} new`;
    noun.hidden = true;
  };

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "phn-pill-prev";
  prev.title = "Previous new comment (Shift+N)";
  prev.setAttribute("aria-label", "Previous new comment");
  prev.innerHTML = arrowUp;
  prev.addEventListener("click", () => jump(-1));

  const next = document.createElement("button");
  next.type = "button";
  next.className = "phn-pill-next";
  next.title = "Next new comment (n)";
  const label = document.createElement("span");
  label.textContent = `${newCount} new`;
  // Dropped on phones, where the pill has to stay one line.
  const noun = document.createElement("span");
  noun.className = "phn-pill-noun";
  noun.textContent = newCount === 1 ? " comment" : " comments";
  next.append(label, noun);
  next.insertAdjacentHTML("beforeend", arrowDown);
  const key = document.createElement("kbd");
  key.textContent = "n";
  key.setAttribute("aria-hidden", "true");
  next.append(key);
  next.addEventListener("click", () => jump(1));

  const pill = document.createElement("div");
  pill.className = "phn-pill";
  pill.append(prev, next);
  document.body.append(pill);

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "n" || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!document.documentElement.classList.contains("phn")) return;
    if (document.documentElement.dataset.phnNew !== "true") return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
    event.preventDefault();
    jump(event.shiftKey ? -1 : 1);
  });
}

/**
 * HN has no quote markup: readers quote with a leading ">". Each such paragraph gets a class.
 * The first paragraph of a comment is bare text before the first <p>, so it is wrapped in one.
 */
export function markQuotes(): void {
  for (const text of document.querySelectorAll<HTMLElement>(".commtext, .toptext")) {
    const lead: ChildNode[] = [];
    for (const node of text.childNodes) {
      if (node instanceof HTMLParagraphElement || (node instanceof HTMLElement && node.classList.contains("reply"))) break;
      lead.push(node);
    }
    if (lead[0]?.textContent?.trimStart().startsWith(">")) {
      const p = document.createElement("p");
      p.className = "phn-quote phn-lead";
      lead[0].before(p);
      p.append(...lead);
    }
    for (const p of text.querySelectorAll(":scope > p")) {
      if (p.textContent?.trimStart().startsWith(">")) p.classList.add("phn-quote");
    }
    // The bar marks the quote, so the ">" it was typed with goes.
    for (const quote of text.querySelectorAll(":scope > p.phn-quote")) {
      const walker = document.createTreeWalker(quote, NodeFilter.SHOW_TEXT);
      let first = walker.nextNode();
      while (first && !first.textContent?.trim()) first = walker.nextNode();
      if (first?.textContent) first.textContent = first.textContent.replace(/^\s*>\s?/, "");
    }
  }
}
