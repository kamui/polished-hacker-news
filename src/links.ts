const READING_LINKS = ".titleline > a, .commtext a, .toptext a";
const OURS = "phnTab";

/** Decided at click time so the setting applies live, without a pass over every link on the page. */
export function initNewTabLinks(isOn: () => boolean): void {
  const prepare = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>(READING_LINKS);
    if (!link) return;
    const external = link.host !== location.host;
    if (isOn() && external) {
      link.target = "_blank";
      link.relList.add("noopener");
      link.dataset[OURS] = "";
    } else if (OURS in link.dataset) {
      link.removeAttribute("target");
      delete link.dataset[OURS];
    }
  };
  document.addEventListener("click", prepare, true);
}
