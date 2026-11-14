import { initNewCommentNav, initThreadControls, markNewComments, markStoryAuthor } from "./comments";
import { isItemPage, parseCount, storyIdFromUrl } from "./hn";
import { initNewTabLinks } from "./links";
import { addListHeading, keepKarma, rememberDownvoteSlot, setTinIcon } from "./page";
import { mountPanel, mountRestoreLink } from "./panel";
import { mountSearch } from "./search";
import {
  type Settings,
  applySettings,
  flushSettings,
  loadSettings,
  onSettingsChanged,
  saveSettings,
} from "./settings";
import { getStories, pruneOccasionally, recordVisit } from "./stories";
import { initStoryList } from "./stories-page";
import { initVotes } from "./votes";

async function trackComments(): Promise<void> {
  const fatItem = document.querySelector("table.fatitem tr.athing");
  const isStory = fatItem?.classList.contains("submission") ?? false;
  const id = storyIdFromUrl();
  const previous = id && isStory ? (await getStories([id])).get(id) : undefined;

  const { maxId, newCount } = markNewComments(previous?.m);
  markStoryAuthor();
  initThreadControls();
  initNewCommentNav(newCount);

  if (id && isStory) {
    const count = parseCount(document.querySelector(".fatitem .subline")?.textContent) ?? 0;
    await recordVisit(id, { maxId, count });
  }
}

async function saveAndReload(settings: Settings): Promise<void> {
  saveSettings(settings);
  await flushSettings();
  location.reload();
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  let settings = await loadSettings();
  applySettings(settings);
  addEventListener("pagehide", () => void flushSettings());

  if (!settings.enabled) {
    mountRestoreLink(() => void saveAndReload({ ...settings, enabled: true }));
    return;
  }

  setTinIcon(settings.tinIcon);
  keepKarma();
  rememberDownvoteSlot();
  mountSearch();
  const panel = mountPanel(
    settings,
    (next) => {
      settings = next;
      applySettings(next);
      setTinIcon(next.tinIcon);
      saveSettings(next);
    },
    () => void saveAndReload({ ...settings, enabled: false }),
  );
  onSettingsChanged((next) => {
    settings = next;
    applySettings(next);
    setTinIcon(next.tinIcon);
    panel.render(next);
  });

  initVotes();
  initNewTabLinks(() => settings.newTab);
  if (isItemPage()) await trackComments();
  else {
    addListHeading();
    initThreadControls();
    await initStoryList();
  }
  void pruneOccasionally();
  performance.measure("phn:init", { start: startedAt });
}

void main();
