/** The cell holding login/logout, at the right end of HN's header. */
export const headerEndCell = () =>
  document.querySelector("#hnmain > tbody > tr:first-child > td > table td:last-child");

/** Adds a button to the header's right end: before the account links when there are some, so focus moves left to right. */
export function placeInHeader(button: HTMLElement): boolean {
  const cell = headerEndCell();
  if (!(cell instanceof HTMLTableCellElement)) {
    const bar = document.querySelector(".phn-bare-header");
    bar?.append(button);
    return bar !== null;
  }
  const account = cell.cellIndex > 1 ? cell.querySelector(":scope > .pagetop") : null;
  if (account) account.before(button);
  else cell.append(button);
  return true;
}

/** Wires a header button to a panel shown beneath it: toggle, click-away, and Escape to close. */
export function attachPopover(button: HTMLElement, panel: HTMLElement, onOpen?: () => void): void {
  button.setAttribute("aria-expanded", "false");

  // Below the whole header: on a phone the nav row sits under the buttons and would show at the panel's sides.
  const header = button.closest("table, header") ?? button;
  const place = () => {
    const anchor = button.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    panel.style.top = `${header.getBoundingClientRect().bottom + 8}px`;
    const free = viewport - panel.offsetWidth;
    // Hangs to the right of the button, over the header's end rather than the page's text; on a phone
    // the panel nearly fills the width, so it is centred instead.
    panel.style.left = `${free < 120 ? free / 2 : Math.max(12, Math.min(anchor.left, free - 12))}px`;
  };
  const follow = () => {
    if (!panel.hidden) place();
  };
  // The page-width slider moves the header, and the button with it, while the panel is open.
  new ResizeObserver(follow).observe(header);
  window.addEventListener("resize", follow);

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (!open) return;
    place();
    onOpen?.();
  };

  button.addEventListener("click", () => setOpen(panel.hidden !== false));
  document.addEventListener("click", (event) => {
    if (panel.hidden || !(event.target instanceof Node)) return;
    if (!panel.contains(event.target) && !button.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      button.focus();
    }
  });
  // Keeps page-level keyboard shortcuts, HN Companion's included, from firing while a control here has focus.
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") event.stopPropagation();
  });
}
