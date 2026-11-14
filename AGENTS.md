# AGENTS.md

Polished Hacker News restyles news.ycombinator.com in place. Read the README's "How it is built" before changing `src/`.

## Hacker News accounts

Use any Hacker News login only to view signed-in pages and to upvote then undo, as `scripts/check-live.ts` does. Posting, replying, submitting and flagging stay with people, so keep that script aborting every request that isn't a GET. Keep cookies out of code, logs and commits. When Hacker News shows a CAPTCHA, stop and hand it to a person.

## Original work

Write every line and asset here from scratch. "Modern for Hacker News" is proprietary: take nothing from its code or art, and keep KIWI trademarks out.

## Styling

- Hacker News's Content-Security-Policy blocks `data:` URLs, and the live check fails on any blocked load. Add an icon by naming its `lucide-static` file in `cssIcons` in `build.ts`, which ships it in `dist/ui/` and exposes `--phn-i-<name>`.
- `bun run preview` keeps the `build.ts` it started with. Restart it after editing that file.

## Changes

- Run `bun run typecheck` and `bun test` before pushing. After changing anything that reads Hacker News markup (`src/hn.ts`, selectors in `src/styles`), also run `bun run build` then `bun run check:live`; set `CHROMIUM_PATH` if Playwright's Chromium isn't installed.
- Note each user-visible change under the HEAD section of `CHANGELOG.md`, in the same change.

## Releases

Follow the README's Release section. Pushing the `v<version>` tag runs `.github/workflows/release.yml`, which builds the files and publishes the GitHub release, so leave `gh release create` to it. Pushed tags are permanent: fix a bad release by releasing the next version. Chrome Web Store and Edge Add-ons uploads are the maintainer's.
