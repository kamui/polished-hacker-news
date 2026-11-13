import arrowDown from "lucide-static/icons/arrow-down.svg" with { type: "text" };
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
  newCount: number;
}

/**
 * Flags comments that arrived since `seenUpTo`, the highest comment id on the reader's last
 * visit. HN ids only ever increase, so a larger id means a later comment.
 */
export function markNewComments(seenUpTo: number | undefined): CommentSummary {
  const me = loggedInUser();
  let maxId = 0;
  let newCount = 0;
  for (const row of commentRows()) {
    const id = Number(row.id);
    if (!(id > 0)) continue;
    if (id > maxId) maxId = id;
    if (seenUpTo === undefined || id <= seenUpTo) continue;
    if (me && row.querySelector(AUTHOR_LINK)?.textContent === me) continue;
    row.dataset.phnNew = "";
    newCount += 1;
  }
  return { maxId, newCount };
}

export function markStoryAuthor(): void {
  const author = document.querySelector(`.fatitem ${AUTHOR_LINK}`)?.getAttribute("href");
  if (!author) return;
  for (const link of document.querySelectorAll(`.comment-tree .comhead > a[href=${JSON.stringify(author)}]`)) {
    link.classList.add("phn-op");
  }
}

/** HN's toggle counts the comment itself in `n`; say how many replies a collapsed comment hides. */
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

  document.addEventListener("mouseover", (event) => {
    if (!(event.target instanceof Element)) return;
    highlightThread(event.target.closest("td.ind, a.togg") ? railOwner(event.target, event.clientX) : null);
  });
  document.addEventListener("mousemove", (event) => {
    if (event.target instanceof Element && event.target.closest("td.ind")) {
      highlightThread(railOwner(event.target, event.clientX));
    }
  });
}

/** A floating control (and the n / Shift+N keys) that steps through comments new since the last visit. */
export function initNewCommentNav(newCount: number): void {
  if (newCount === 0) return;
  const fresh = () =>
    Array.from(document.querySelectorAll<HTMLTableRowElement>("tr.comtr[data-phn-new]")).filter(
      (row) => row.offsetParent !== null,
    );

  const jump = (direction: 1 | -1) => {
    const rows = fresh();
    if (rows.length === 0) return;
    const edge = (document.querySelector("#hnmain td")?.getBoundingClientRect().bottom ?? 0) + 12;
    const target =
      direction === 1
        ? (rows.find((row) => row.getBoundingClientRect().top > edge + 4) ?? rows[0])
        : (rows.findLast((row) => row.getBoundingClientRect().top < edge - 4) ?? rows.at(-1));
    if (!target) return;
    target.scrollIntoView({ block: "start", behavior: "smooth" });
    target.classList.remove("phn-flash");
    void target.offsetWidth;
    target.classList.add("phn-flash");
  };

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "phn-pill";
  pill.title = "Jump to the next new comment (n)";
  const label = document.createElement("span");
  label.textContent = newCount === 1 ? "1 new comment" : `${newCount} new comments`;
  pill.append(label);
  pill.insertAdjacentHTML("beforeend", arrowDown);
  pill.addEventListener("click", () => jump(1));
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
