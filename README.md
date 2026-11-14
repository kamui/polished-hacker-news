# Polished Hacker News

A browser extension that restyles [Hacker News](https://news.ycombinator.com) for reading: dark
themes down to true black, clear comment threads, and markers for what you have read and what
is new. It changes how the site looks and adds a few conveniences; it does not replace the
site's own pages, voting, or collapsing.

Polished Hacker News is an independent project. It is not affiliated with Y Combinator or Hacker News.

## What it does

- **Themes.** Light, Classic, Slate, Dark and Black, with an option to follow the system's
  light or dark setting.
- **Type.** Inter or Source Serif 4, with live sliders for text size, line spacing and page
  width. Settings sync with your browser profile and survive updates.
- **Comment threads.** Each comment has a rail down to its last reply, with a curved connector
  into every reply. Click a rail, or the round button at its top, to collapse that thread.
  Pointing at a rail lights up the whole thread. A collapsed comment shrinks to one line with
  its author, age, hidden-reply count and opening words.
- **Votes you can see.** An item you upvoted keeps a filled orange arrow; click it to undo.
- **Read and new.** Stories you have opened are dimmed in lists, with a count of comments added
  since your last visit. On a story, comments posted since you last loaded it are tagged
  "new", and a button (or `n` / `Shift+N`) steps through them.
- **Small things.** Open story and comment links in a new tab, keep the header in view, an
  "OP" tag on the submitter's comments, a polish-tin tab icon and header logo
  you can switch off, and one click back to the original design.

## Install from source

Requires [Bun](https://bun.sh) and Chrome or Edge 133 or later.

```sh
bun install
bun run build
```

Open `chrome://extensions` (`edge://extensions` in Edge), turn on Developer mode, choose **Load unpacked**, and select the
`dist` folder.

## Develop

| Command | What it does |
| --- | --- |
| `bun run preview` | Serves live Hacker News pages at `http://localhost:4319` with the extension applied, rebuilding and refreshing as `src/` changes. Pages are fetched logged-out and read-only, and cached in `.preview-cache/` for a minute; add `?fresh` to a URL to refetch it at once. |
| `bun run dev` | Rebuilds `dist/` on change, for use with a loaded unpacked extension. |
| `bun test` | Unit tests. |
| `bun run typecheck` | Type-checks the project. |
| `bun run check:live` | After a build, loads the extension against the live site and checks the markup it depends on. GitHub Actions run this on relevant commits and daily. |
| `bun run zip` | Builds `polished-hacker-news.zip` for the Chrome Web Store and Microsoft Edge Add-ons; the listing copy and screenshots are in `store/`. |
| `bun run package` | Builds the release files into `release/`: `polished-hacker-news-<version>.zip`, the two store images, and `notes.md` from that version's `CHANGELOG.md` section. Fails if `package.json` and `src/manifest.json` disagree on the version, the changelog has no section for it, or there are uncommitted changes. |
| `bun run icons` | Re-renders the icon PNGs, and the store icon, logo and promo tile in `store/`, from the SVGs in `src/assets` (needs a Chromium for `playwright-core`; set `CHROMIUM_PATH`). |

## Daily check against the live site

Hacker News changes its markup without notice, so two workflows run `scripts/check-live.ts`,
which loads the built extension in Chromium against the real site and fails if something the
extension depends on has moved: story and comment authors, vote arrows, comment depth, the
collapse toggle, the login form.

- `check.yml` runs the logged-out checks, with the type check and unit tests, on every commit
  that touches the extension's code.
- `check-daily.yml` runs the full check, signed in, once a day.

To include the logged-in pages, use an account kept for this purpose. Sign in to it in a
browser, copy the value of the `user` cookie for news.ycombinator.com, and add it under the
repository's **Settings → Secrets and variables → Actions** as a secret named `HN_COOKIE`,
with the username as a variable named `HN_USERNAME`. A password will not work here: Hacker
News answers automated password logins with a CAPTCHA. Logging out in that browser ends the
session, so clear the cookie locally instead.

With the cookie set, the check looks at the submit, reply and profile pages, and upvotes one
story and immediately undoes it. It never posts, replies, submits, flags or hides: every
non-GET request is aborted before it is sent. Without the cookie, or once the session expires,
those checks are skipped with a warning.

## Release

1. In `CHANGELOG.md`, rename the HEAD section's entries to a `## <version> (<date>)` section, and start a new, empty HEAD section above it.
2. Set the same version in `package.json` and `src/manifest.json`.
3. Run `bun run package` to check that the files build. Look over `release/notes.md`.
4. Commit to `main`, tag `v<version>`, and push both: `git push origin main v<version>`.

Pushing the tag runs `.github/workflows/release.yml`. It checks that the tag matches the version and is on `main`, runs the type check and tests, runs `bun run package`, and publishes the GitHub release with those files. The store uploads stay manual, using the zip from the release.

## How it is built

Hacker News changes its markup without notice, and extensions that rebuild the page break when
it does. This extension keeps the site's own HTML and restyles it in place, so the site's scripts and
other extensions keep working.

- **Almost everything is CSS**, scoped under one class on `<html>`. Removing the class restores
  the original design. Thread indentation and rails are computed in CSS from the `indent`
  attribute HN already provides, so nothing reflows after the page loads.
- **Scripts stay out of the way.** Event listeners are delegated from the document, there are
  no mutation observers, and the only pass over every comment reads its id to detect new ones.
  Selectors that are costly on very long threads (`:has()`, universal `::selection`) are
  avoided on purpose; see the comments in `src/styles`.
- **Selectors for HN's markup live in `src/hn.ts`**, so a markup change is a one-file fix.
- **Works alongside [Hacker News Companion](https://github.com/hncompanion/browser-extension).**
  The elements it relies on are left in place, its panel and popups are themed in
  `src/styles/70-companion.css`, and the only keys this extension binds (`n`, `Shift+N`) are ones it
  does not use.

## Privacy

Polished Hacker News makes no network requests and collects nothing. Display settings are stored with
`chrome.storage.sync`; the ids of stories you have opened, with the comment count and newest
comment id at your last visit, are stored locally with `chrome.storage.local` and dropped after
120 days without a visit. The only permission it asks for is `storage`.

## Licence

MIT. Bundled fonts and icons keep their own licences; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
