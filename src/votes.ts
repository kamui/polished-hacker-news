type Vote = "up" | "down";

/**
 * HN shows which way you voted only through an "unvote"/"undown" link. Once the undo window
 * has passed that link is gone and just the hidden arrow remains, which is unambiguous only
 * where there is no down arrow (stories, and comments for readers without downvote rights).
 */
function voteFor(id: string): Vote | undefined {
  const undo = document.getElementById(`un_${id}`)?.textContent;
  if (undo === "unvote") return "up";
  if (undo === "undown") return "down";
  const voted = document.getElementById(`up_${id}`)?.classList.contains("nosee");
  return voted && !document.getElementById(`down_${id}`) ? "up" : undefined;
}

function syncVote(id: string): void {
  const row = document.getElementById(id);
  if (!row) return;
  const vote = voteFor(id);
  if (vote) row.dataset.phnVoted = vote;
  else delete row.dataset.phnVoted;
}

export function initVotes(): void {
  for (const link of document.querySelectorAll('a[id^="un_"], a.nosee[id^="up_"]')) {
    syncVote(link.id.slice(link.id.indexOf("_") + 1));
  }

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
