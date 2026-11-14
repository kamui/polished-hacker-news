/**
 * Canary for changes on Hacker News's side. Loads the built extension in Chromium against the
 * live site and checks the markup the extension relies on, plus the behaviour built on it.
 * Run after `bun run build`; the scheduled workflow runs it daily.
 *
 * With HN_COOKIE set to the value of a signed-in `user` cookie it also checks the logged-in
 * pages, and with HN_USERNAME that the header shows that account. The account is only used
 * to look at pages and to upvote one story and immediately undo it. It never posts, replies,
 * submits, flags or hides: every non-GET request is aborted before it is sent.
 *
 * Exit codes: 0 all good, or the site could not be reached or the session was not accepted
 * (reported as a warning, since neither says anything about the markup); 1 a check failed.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Page, chromium } from "playwright-core";

const SITE = "https://news.ycombinator.com/";
const dist = join(import.meta.dir, "../dist");
const failures: string[] = [];
const passes: string[] = [];

class Unreachable extends Error {}

function check(name: string, ok: boolean, detail = ""): void {
  (ok ? passes : failures).push(detail ? `${name} (${detail})` : name);
}

/** HN rate-limits rapid page loads with a 503, so a load is paced and retried after a growing pause. */
async function open(page: Page, path: string): Promise<void> {
  let problem = "";
  for (const pause of [0, 8_000, 25_000]) {
    await page.waitForTimeout(pause + 1_500);
    const response = await page.goto(SITE + path, { waitUntil: "load", timeout: 45_000 }).catch(() => null);
    const text = (await page.locator("body").innerText().catch(() => "")).slice(0, 200);
    const limited = !response || response.status() >= 500 || /^Sorry\b|not able to serve your requests/i.test(text);
    if (!limited && response.status() < 400) return;
    problem = `${path}: HTTP ${response?.status() ?? "no response"} ${text.slice(0, 80)}`.trim();
    if (!limited) break;
  }
  throw new Unreachable(problem);
}

/** Counts elements matching a selector that actually take up space on the page. */
const visible = (page: Page, selector: string) =>
  page.evaluate(
    (sel) => [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => el.getBoundingClientRect().width > 0).length,
    selector,
  );

async function frontPage(page: Page): Promise<string | undefined> {
  await open(page, "news");
  const stories = await page.locator("tr.athing.submission").count();
  check("extension applied to the page", await page.evaluate(() => document.documentElement.classList.contains("phn")));
  check("page type attribute", (await page.getAttribute("html", "op")) === "news");
  check("front page lists stories", stories >= 25, `${stories} found`);
  check("story titles", (await visible(page, "tr.athing.submission .titleline > a")) >= stories);
  check("story authors visible", (await visible(page, '.subline > a[href^="user?id="]')) >= stories - 5);
  check("story ages carry a timestamp", (await page.locator(".subline .age[title]").count()) >= stories - 5);
  check("vote arrows visible", (await visible(page, 'tr.athing.submission a[id^="up_"] .votearrow')) >= stories - 5);
  check("nav links visible", (await visible(page, ".pagetop a")) >= 7);
  check("footer search form", (await page.locator('form[action*="algolia"]:not(.phn-search)').count()) === 1);
  check("search and settings buttons mounted", (await visible(page, ".phn-icon-btn")) === 2);
  check("page heading added", (await visible(page, ".phn-heading h1")) === 1);
  check("no sideways overflow on lists", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

  return page.evaluate(() => {
    const counts = [...document.querySelectorAll<HTMLAnchorElement>('.subline > a[href^="item?id="]')].map((a) => ({
      href: a.getAttribute("href"),
      n: Number(a.textContent?.replace(/ /g, " ").match(/(\d+) comment/)?.[1] ?? 0),
    }));
    // Busy enough to have nested replies, small enough to load quickly.
    return counts.filter((c) => c.n >= 20).sort((a, b) => a.n - b.n)[0]?.href ?? undefined;
  });
}

async function storyPage(page: Page, path: string): Promise<void> {
  await open(page, path);
  const info = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>("tr.athing.comtr")];
    const step = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--phn-step"));
    const nested = rows.find((row) => Number(row.querySelector("td.ind")?.getAttribute("indent")) >= 1);
    const indent = nested?.querySelector<HTMLElement>("td.ind");
    return {
      rows: rows.length,
      withDepth: rows.filter((row) => /^\d+$/.test(row.querySelector("td.ind")?.getAttribute("indent") ?? "")).length,
      withAuthor: rows.filter((row) => {
        const link = row.querySelector<HTMLElement>('.comhead > a[href^="user?id="]');
        return link?.textContent && link.getBoundingClientRect().width > 0;
      }).length,
      withToggle: rows.filter((row) => /^\d+$/.test(row.querySelector("a.togg")?.getAttribute("n") ?? "")).length,
      withText: rows.filter((row) => row.querySelector(".commtext")).length,
      withAge: rows.filter((row) => row.querySelector(".comhead .age[title]")).length,
      nestedIndent: indent ? indent.getBoundingClientRect().width / Number(indent.getAttribute("indent")) : 0,
      step,
      title: !!document.querySelector("table.fatitem .titleline > a"),
      storyAuthor: !!document.querySelector('.fatitem .subline > a[href^="user?id="]'),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  check("story page has a title and author", info.title && info.storyAuthor);
  check("comments found", info.rows >= 5, `${info.rows} found`);
  check("every comment has a numeric depth", info.withDepth === info.rows, `${info.withDepth}/${info.rows}`);
  check("comment authors visible", info.withAuthor >= info.rows * 0.9, `${info.withAuthor}/${info.rows}`);
  check("every comment has a collapse toggle with a count", info.withToggle === info.rows, `${info.withToggle}/${info.rows}`);
  check("comment text present", info.withText >= info.rows * 0.9, `${info.withText}/${info.rows}`);
  check("comment ages carry a timestamp", info.withAge >= info.rows * 0.9, `${info.withAge}/${info.rows}`);
  check("replies indent by one rail step per level", Math.abs(info.nestedIndent - info.step) < 1, `${info.nestedIndent}px vs ${info.step}px`);
  check("no sideways overflow on threads", !info.overflow);

  const first = page.locator("tr.athing.comtr").first();
  const hiddenBefore = await page.locator("tr.comtr.noshow").count();
  await first.locator("a.togg").click({ position: { x: 13, y: 20 } });
  check("collapsing a comment works", await first.evaluate((row) => row.classList.contains("coll")));
  await first.locator("a.togg").click({ position: { x: 13, y: 14 } });
  check(
    "expanding it again works",
    (await first.evaluate((row) => !row.classList.contains("coll"))) && (await page.locator("tr.comtr.noshow").count()) === hiddenBefore,
  );
}

async function otherPages(page: Page): Promise<void> {
  await open(page, "newcomments");
  check("comment list authors visible", (await visible(page, 'tr.athing td.default .comhead > a[href^="user?id="]')) >= 10);
  await open(page, "login");
  check("login page is the bare form", (await page.locator('body > form input[name="acct"]').count()) >= 1);
  check("login page has no page type attribute", (await page.getAttribute("html", "op")) === null);
}

type SignIn = "signed in" | "no account configured" | "refused";

/**
 * Signs in with a session cookie. A password cannot be used: Hacker News answers automated
 * password logins with a CAPTCHA.
 */
async function signIn(page: Page): Promise<SignIn> {
  const cookie = process.env.HN_COOKIE?.trim().replace(/^user=/, "");
  if (!cookie) return "no account configured";
  await page.context().addCookies([
    { name: "user", value: cookie, domain: "news.ycombinator.com", path: "/", secure: true, httpOnly: true },
  ]);
  await open(page, "news");
  return (await page.locator("a#me").count()) === 1 ? "signed in" : "refused";
}

const voteState = (page: Page, id: string) =>
  page.evaluate((id) => {
    const arrow = document.querySelector(`#up_${id} .votearrow`);
    return {
      marker: document.getElementById(id)?.dataset.phnVoted ?? "none",
      undo: document.getElementById(`un_${id}`)?.textContent ?? "none",
      arrowShown: !!arrow && getComputedStyle(arrow.parentElement!).visibility === "visible",
    };
  }, id);

async function voteRoundTrip(page: Page): Promise<void> {
  await open(page, "newest");
  const id = await page.evaluate(
    () => [...document.querySelectorAll<HTMLElement>("tr.athing.submission")].find((row) => !row.dataset.phnVoted && row.querySelector('a[id^="up_"]:not(.nosee)'))?.id,
  );
  if (!id) return check("found a story to test voting on", false);

  await page.locator(`#up_${id}`).click();
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(600);
  const voted = await voteState(page, id);
  check("an upvote shows as a filled arrow after reload", voted.marker === "up" && voted.undo === "unvote" && voted.arrowShown, JSON.stringify(voted));

  await page.locator(`#up_${id}`).click();
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(600);
  const undone = await voteState(page, id);
  check(`clicking the filled arrow undoes the vote (story ${id})`, undone.marker === "none" && undone.undo === "none", JSON.stringify(undone));
}

async function loggedInPages(page: Page, story: string | undefined): Promise<void> {
  const header = await page.evaluate(() => ({
    name: document.querySelector("a#me")?.textContent ?? "",
    karma: document.querySelector<HTMLElement>("a#me")?.dataset.phnKarma ?? "",
    logout: !!document.querySelector("a#logout"),
    navHeight: document.querySelector(".pagetop")?.getBoundingClientRect().height ?? 0,
  }));
  const expected = process.env.HN_USERNAME;
  check("header shows the account", header.name !== "" && (!expected || header.name === expected) && header.logout);
  check("karma shown beside the username", /^-?\d+$/.test(header.karma), `"${header.karma}"`);
  check("nav stays on one line when signed in", header.navHeight > 0 && header.navHeight < 50, `${header.navHeight}px`);

  await voteRoundTrip(page);

  await open(page, "submit");
  check("submit page fields", (await visible(page, '#bigbox form :is(input[name="title"], input[name="url"], textarea[name="text"])')) === 3);
  check("submit page title in the header", (await visible(page, ".pagetop b")) === 1);

  if (story) {
    await open(page, story);
    const reply = await page.locator('tr.comtr .reply a[href^="reply?"]').first().getAttribute("href").catch(() => null);
    check("comments offer a reply link", !!reply);
    if (reply) {
      await open(page, reply);
      check("reply page shows the comment and an editor", (await visible(page, '.fatitem td.default .commtext, .fatitem form[action="comment"] textarea')) === 2);
    }
  }

  await open(page, `user?id=${header.name}`);
  check("own profile form", (await page.locator("form.profileform textarea[name=\"about\"]").count()) === 1);
}

const context = await chromium.launchPersistentContext(await mkdtemp(join(tmpdir(), "phn-live-")), {
  executablePath: process.env.CHROMIUM_PATH,
  headless: false,
  viewport: { width: 1360, height: 900 },
  args: ["--headless=new", `--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});
// The account must never post, reply or submit. HN votes with GET requests, so allowing only
// GETs makes that impossible rather than merely unintended.
await context.route(`${SITE}**`, (route) => (route.request().method() === "GET" ? route.continue() : route.abort()));
const page = context.pages()[0] ?? (await context.newPage());
const pageErrors: string[] = [];
page.on("pageerror", (error) => pageErrors.push(String(error)));

let unreachable: string | undefined;
let account: SignIn = "no account configured";
try {
  const story = await frontPage(page);
  if (story) await storyPage(page, story);
  else check("found a story with comments to open", false);
  await otherPages(page);

  account = await signIn(page);
  if (account === "signed in") await loggedInPages(page, story);
  check("no script errors on the page", pageErrors.length === 0, pageErrors.join("; ").slice(0, 200));
} catch (error) {
  if (!(error instanceof Unreachable)) throw error;
  unreachable = error.message;
} finally {
  await context.close();
}

console.log(`${passes.length} checks passed (account: ${account})`);
for (const failure of failures) console.log(`FAILED: ${failure}`);
if (unreachable) console.log(`::warning::Hacker News could not be reached, so the check is incomplete: ${unreachable}`);
if (account === "refused" && failures.length === 0) {
  console.log("::warning::Hacker News did not accept the session cookie (it has probably expired), so the logged-in checks were skipped. Sign in again and update the HN_COOKIE secret.");
}
process.exit(failures.length > 0 ? 1 : 0);
