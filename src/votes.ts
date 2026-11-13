type Vote = "up" | "down";

/** HN marks a vote only by adding an "unvote"/"undown" link, so that link is the source of truth. */
function voteFor(id: string): Vote | undefined {
  const undo = document.getElementById(`un_${id}`)?.textContent;
  if (undo === "unvote") return "up";
  if (undo === "undown") return "down";
  return undefined;
}

function syncVote(id: string): void {
  const row = document.getElementById(id);
  if (!row) return;
  const vote = voteFor(id);
  if (vote) row.dataset.phnVoted = vote;
  else delete row.dataset.phnVoted;
}

export function initVotes(): void {
  for (const undo of document.querySelectorAll('a[id^="un_"]')) syncVote(undo.id.slice(3));

  // Capture phase: HN's own click handler stops the event before it could bubble to us.
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[id^="up_"], a[id^="down_"], a[id^="un_"]');
      if (!link) return;
      const id = link.id.slice(link.id.indexOf("_") + 1);

      if (link.classList.contains("nosee")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.getElementById(`un_${id}`)?.click();
      }
      setTimeout(() => syncVote(id));
    },
    true,
  );
}
