# Changelog

Changes to Polished Hacker News that a user of the extension would notice, newest first.
Versions match the `version` in `src/manifest.json` and the `v*` tags.

## HEAD (unreleased)

[Changes since 0.0.2](https://github.com/kamui/polished-hacker-news/compare/v0.0.2...main)

### Added

- A "Use the polish tin tab icon" switch in the settings panel. Turning it off puts back
  Hacker News's own tab icon at once, without a reload.

## 0.0.2 (2026-11-13)

[Release](https://github.com/kamui/polished-hacker-news/releases/tag/v0.0.2) ·
[Changes since 0.0.1](https://github.com/kamui/polished-hacker-news/compare/v0.0.1...v0.0.2)

The first version submitted to the Chrome Web Store.

### Added

- Hacker News tabs show the extension's icon while the restyle is on.
- A store icon and a small promo tile for the store listings, in `store/`.

### Changed

- New logo: a shoe polish tin lettered HACKER NEWS POLISH. The 32px and 48px icons use a
  simplified lid with "HN" on it, and the 16px icon a bare lid, so the letters stay readable.
- The 128px icon has transparent padding around the artwork, as the Chrome Web Store asks.

## 0.0.1 (2026-11-13)

[Release](https://github.com/kamui/polished-hacker-news/releases/tag/v0.0.1)

The first release, published on GitHub only.

### Added

- Five themes: Light, Classic, Slate, Dark and Black, with Black as the default and an option
  to follow the system's light or dark setting.
- Inter or Source Serif 4, with live sliders for text size, line spacing and page width.
- A settings panel in the header. Settings sync with the browser profile.
- Comment threads with a rail from each comment down to its last reply, at any nesting depth.
  Clicking a rail or the button at its top collapses the thread, and pointing at a rail
  highlights it. A collapsed comment shows its author, age, reply count and opening words.
- An action row under each comment for voting and replying.
- Upvoted stories and comments keep a filled orange arrow. Clicking it undoes the vote.
- Stories you have opened are dimmed in lists, with a count of comments added since the last
  visit.
- Comments posted since you last loaded a story are tagged "new". A button, or `n` and
  `Shift+N`, steps through them.
- A search button in the header that uses Hacker News's own search.
- Options to open links in a new tab, keep the header in view, and smooth fonts on macOS.
- An "OP" tag on the submitter's comments.
- Hacker News's coloured usernames, such as green for new accounts, in a shade that fits each
  theme.
- Styling for every page, logged in or out: login, submit, reply, edit, profile, polls, lists
  and the plain message pages.
- "Show the original design", which turns the restyle off.
- Compatibility with the Hacker News Companion extension.
