/** What we remember about a story the reader has opened. */
export interface StoryRecord {
  /** Last visit, in epoch seconds. */
  t: number;
  /** Highest comment id on the page at the last visit to its comments. */
  m?: number;
  /** Comment count shown at the last visit to its comments. */
  c?: number;
}

const PREFIX = "s:";
const PRUNE_KEY = "prunedAt";
const KEEP_SECONDS = 120 * 24 * 3600;
const PRUNE_EVERY_SECONDS = 24 * 3600;

const key = (id: string) => PREFIX + id;
const now = () => Math.floor(Date.now() / 1000);

function parseRecord(raw: unknown): StoryRecord | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.t !== "number") return undefined;
  return {
    t: r.t,
    ...(typeof r.m === "number" ? { m: r.m } : {}),
    ...(typeof r.c === "number" ? { c: r.c } : {}),
  };
}

export async function getStories(ids: readonly string[]): Promise<Map<string, StoryRecord>> {
  const found = new Map<string, StoryRecord>();
  if (ids.length === 0) return found;
  const stored = await chrome.storage.local.get(ids.map(key));
  for (const id of ids) {
    const record = parseRecord(stored[key(id)]);
    if (record) found.set(id, record);
  }
  return found;
}

/** Records a visit, keeping what an earlier visit learned about the comments unless replaced. */
export async function recordVisit(
  id: string,
  comments?: { maxId: number; count: number },
): Promise<void> {
  const previous = (await getStories([id])).get(id);
  const record: StoryRecord = {
    ...previous,
    t: now(),
    ...(comments ? { m: Math.max(comments.maxId, previous?.m ?? 0), c: comments.count } : {}),
  };
  await chrome.storage.local.set({ [key(id)]: record });
}

export function expiredKeys(all: Record<string, unknown>, nowSeconds: number): string[] {
  return Object.keys(all).filter((k) => {
    if (!k.startsWith(PREFIX)) return false;
    const record = parseRecord(all[k]);
    return !record || nowSeconds - record.t > KEEP_SECONDS;
  });
}

export async function pruneOccasionally(): Promise<void> {
  const { [PRUNE_KEY]: prunedAt } = await chrome.storage.local.get(PRUNE_KEY);
  if (typeof prunedAt === "number" && now() - prunedAt < PRUNE_EVERY_SECONDS) return;
  await chrome.storage.local.set({ [PRUNE_KEY]: now() });
  const stale = expiredKeys(await chrome.storage.local.get(null), now());
  if (stale.length > 0) await chrome.storage.local.remove(stale);
}
