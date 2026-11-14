/**
 * Design preview: serves live Hacker News pages from localhost with the extension's styles and
 * scripts applied, rebuilding and refreshing the page as files under src/ change.
 *
 *   bun run preview            then open http://localhost:4319
 *
 * Pages are fetched logged-out and read-only, and cached on disk so browsing the preview
 * doesn't lean on news.ycombinator.com. Add ?fresh to any URL to refetch it.
 *
 * To preview logged-in pages, start it with HN_COOKIE set to the value of your `user` cookie
 * from news.ycombinator.com. The cookie is only ever sent to news.ycombinator.com. In that
 * mode nothing is written to disk (pages carry tokens that can act on your account), and only
 * the read-only pages listed in READ_ONLY are fetched, so a stray click cannot vote, hide,
 * flag or log you out.
 */
import { watch } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const dist = join(root, "dist");
const cacheDir = join(root, ".preview-cache");
const ORIGIN = "https://news.ycombinator.com";
const PORT = Number(process.env.PORT ?? 4319);
const PAGE_TTL_MS = 60_000;
const ASSET_TTL_MS = 24 * 3600_000;
const FONT_URL = "chrome-extension://__MSG_@@extension_id__/fonts/";

const cookieValue = process.env.HN_COOKIE?.trim().replace(/^user=/, "");
const COOKIE = cookieValue ? `user=${cookieValue}` : undefined;
/** HN performs votes, hides, flags and logout as plain GET links, so logged in we fetch only what is known to be harmless. */
const READ_ONLY =
  /^\/(news|newest|front|ask|show|jobs|shownew|asknew|best|active|bestcomments|newcomments|noobstories|noobcomments|pool|classic|highlights|launches|leaders|lists|item|user|submitted|threads|favorites|upvoted|hidden|flagged|from|context|over|reply|submit|edit|delete-confirm|changepw|topcolors|formatdoc|login|forgot|[\w-]+\.(html|css|js|svg|gif|png|ico))$/;

const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

const HEAD_INJECT = [
  '<script src="/__preview/shim.js"></script>',
  '<link rel="stylesheet" href="/__preview/content.css">',
  '<script src="/__preview/early.js"></script>',
  '<script src="/__preview/content.js" defer></script>',
].join("");

await mkdir(cacheDir, { recursive: true });
const builder = Bun.spawn(["bun", "run", join(root, "build.ts"), "--watch"], { stdout: "inherit", stderr: "inherit" });
process.on("exit", () => builder.kill());
while (!(await Bun.file(join(dist, "content.js")).exists())) await Bun.sleep(50);

const clients = new Set<ReadableStreamDefaultController<string>>();
let pending: ReturnType<typeof setTimeout> | undefined;
let pendingEvent: "css" | "reload" = "css";
watch(dist, (_event, file) => {
  if (file !== "content.css") pendingEvent = "reload";
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const client of clients) client.enqueue(`event: ${pendingEvent}\ndata: 1\n\n`);
    pendingEvent = "css";
  }, 150);
});

function events(): Response {
  let controller: ReadableStreamDefaultController<string>;
  const stream = new ReadableStream<string>({
    start(c) {
      controller = c;
      clients.add(c);
      c.enqueue(": connected\n\n");
    },
    cancel() {
      clients.delete(controller);
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
}

async function extensionFile(name: string): Promise<Response> {
  const noStore = { "cache-control": "no-store" };
  if (name === "shim.js") {
    const manifest = await Bun.file(join(dist, "manifest.json")).text();
    const shim = await Bun.file(join(import.meta.dir, "preview-shim.js")).text();
    return new Response(`const MANIFEST = ${manifest};\n${shim}`, { headers: { ...noStore, "content-type": "text/javascript" } });
  }
  if (name === "content.css") {
    const css = (await Bun.file(join(dist, name)).text()).replaceAll(FONT_URL, "/__preview/fonts/");
    return new Response(css, { headers: { ...noStore, "content-type": "text/css" } });
  }
  if (!/^(early\.js|content\.js|fonts\/[\w.-]+\.woff2)$/.test(name)) return new Response("Not found", { status: 404 });
  return new Response(Bun.file(join(dist, name)), { headers: noStore });
}

interface Cached {
  type: string;
  body: Uint8Array;
}

const memory = new Map<string, Cached & { at: number }>();

async function fromOriginLoggedIn(pathAndQuery: string, fresh: boolean): Promise<Cached | undefined> {
  const hit = memory.get(pathAndQuery);
  if (hit && !fresh && Date.now() - hit.at < PAGE_TTL_MS) return hit;
  try {
    const response = await fetch(ORIGIN + pathAndQuery, {
      headers: { "user-agent": USER_AGENT, cookie: COOKIE ?? "" },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const page = { type: response.headers.get("content-type") ?? "application/octet-stream", body: new Uint8Array(await response.arrayBuffer()), at: Date.now() };
    memory.set(pathAndQuery, page);
    return page;
  } catch (error) {
    console.warn(`Could not fetch ${pathAndQuery} (${error}).`);
    return hit;
  }
}

async function fromOrigin(pathAndQuery: string, fresh: boolean): Promise<Cached | undefined> {
  const base = join(cacheDir, encodeURIComponent(pathAndQuery));
  const body = Bun.file(`${base}.body`);
  const meta = Bun.file(`${base}.type`);
  const cached = async () =>
    (await body.exists()) ? { type: await meta.text(), body: new Uint8Array(await body.arrayBuffer()) } : undefined;

  if (!fresh && (await body.exists())) {
    const type = await meta.text();
    const ttl = type.startsWith("text/html") ? PAGE_TTL_MS : ASSET_TTL_MS;
    if (Date.now() - body.lastModified < ttl) return cached();
  }
  try {
    const response = await fetch(ORIGIN + pathAndQuery, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get("content-type") ?? "application/octet-stream";
    const bytes = new Uint8Array(await response.arrayBuffer());
    await Bun.write(`${base}.body`, bytes);
    await Bun.write(`${base}.type`, type);
    return { type, body: bytes };
  } catch (error) {
    console.warn(`Could not fetch ${pathAndQuery} (${error}); using the cached copy if there is one.`);
    return cached();
  }
}

const server = Bun.serve({
  port: PORT,
  idleTimeout: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/__preview/events") return events();
    if (url.pathname.startsWith("/__preview/")) return extensionFile(url.pathname.slice("/__preview/".length));
    if (request.method !== "GET") {
      return new Response("The preview is read-only: logging in, voting and commenting only work on the real site.", { status: 405 });
    }

    const fresh = url.searchParams.has("fresh");
    url.searchParams.delete("fresh");
    const pathAndQuery = (url.pathname === "/" ? "/news" : url.pathname) + url.search;
    if (COOKIE && !READ_ONLY.test(url.pathname === "/" ? "/news" : url.pathname)) {
      return new Response(`Blocked: ${url.pathname} is not on the logged-in preview's read-only list.`, { status: 403 });
    }
    const page = COOKIE ? await fromOriginLoggedIn(pathAndQuery, fresh) : await fromOrigin(pathAndQuery, fresh);
    if (!page) return new Response(`Could not load ${pathAndQuery} from Hacker News, and no cached copy exists yet.`, { status: 502 });
    if (!page.type.startsWith("text/html")) return new Response(page.body, { headers: { "content-type": page.type } });

    const source = new TextDecoder().decode(page.body);
    // HN's bare pages (one-line messages, the password-reset form) have no <head> to inject into.
    const html = (source.includes("<head>") ? source.replace("<head>", `<head>${HEAD_INJECT}`) : HEAD_INJECT + source).replaceAll(
      `href="${ORIGIN}"`,
      'href="/"',
    );
    return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
  },
});

console.log(`Preview running at http://localhost:${server.port}${COOKIE ? " (logged in, read-only)" : ""}`);
