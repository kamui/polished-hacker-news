/** The cell holding login/logout, at the right end of HN's header. */
export const headerEndCell = () =>
  document.querySelector("#hnmain > tbody > tr:first-child > td > table td:last-child");

/** Adds a button to the header's right end: before the account links when there are some, so focus moves left to right. */
export function placeInHeader(button: HTMLElement): boolean {
  const cell = headerEndCell();
  if (!(cell instanceof HTMLTableCellElement)) return false;
  const account = cell.cellIndex > 1 ? cell.querySelector(":scope > .pagetop") : null;
  if (account) account.before(button);
  else cell.append(button);
  return true;
}

/** Wires a header button to a panel shown beneath it: toggle, click-away, and Escape to close. */
export function attachPopover(button: HTMLElement, panel: HTMLElement, onOpen?: () => void): void {
  button.setAttribute("aria-expanded", "false");

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (!open) return;
    const anchor = button.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    panel.style.top = `${anchor.bottom + 10}px`;
    panel.style.right = `${Math.min(Math.max(12, viewport - anchor.right), viewport - panel.offsetWidth - 12)}px`;
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
