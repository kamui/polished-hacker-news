import { commentsLink, parseCount, storyRows } from "./hn";
import { getStories, recordVisit } from "./stories";

/** Marks stories opened before, and how many comments each has gained since. */
export async function initStoryList(): Promise<void> {
  const rows = storyRows();
  if (rows.length === 0) return;
  const records = await getStories(rows.map((row) => row.id));

  for (const row of rows) {
    const record = records.get(row.id);
    if (!record) continue;
    row.dataset.phnRead = "";

    const link = commentsLink(row);
    const count = parseCount(link?.textContent);
    if (link && count !== undefined && record.c !== undefined && count > record.c) {
      const fresh = document.createElement("a");
      fresh.className = "phn-fresh";
      fresh.href = link.href;
      fresh.textContent = `+${count - record.c}`;
      fresh.title = `${count - record.c} new since you last read this`;
      link.after(fresh);
    }
  }

  const onOpen = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || event.button > 1) return;
    if (!event.target.closest(".titleline > a, .subline a[href^='item?id=']")) return;
    const row = event.target.closest("tr")?.matches("tr.athing.submission")
      ? event.target.closest<HTMLTableRowElement>("tr")
      : (event.target.closest("tr")?.previousElementSibling as HTMLTableRowElement | null);
    if (!row?.matches("tr.athing.submission")) return;
    row.dataset.phnRead = "";
    void recordVisit(row.id);
  };
  document.addEventListener("click", onOpen, true);
  document.addEventListener("auxclick", onOpen, true);
}
