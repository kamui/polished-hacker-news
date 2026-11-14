# Changelog

Changes to Polished Hacker News that a user of the extension would notice, newest first.
Versions match the `version` in `src/manifest.json` and the `v*` tags.

## HEAD (unreleased)

[Changes since 0.0.5](https://github.com/kamui/polished-hacker-news/compare/v0.0.5...main)

Nothing yet.

## 0.0.5 (2026-11-14)

[Release](https://github.com/kamui/polished-hacker-news/releases/tag/v0.0.5) ·
[Changes since 0.0.4](https://github.com/kamui/polished-hacker-news/compare/v0.0.4...v0.0.5)

### Changed

- Comment and post text now fills the page width you set, instead of stopping at about 75 characters a line.
- The settings and search menus open to the right of their buttons, over the header's end, so they cover less of the page.

## 0.0.4 (2026-11-14)

[Release](https://github.com/kamui/polished-hacker-news/releases/tag/v0.0.4) ·
[Changes since 0.0.3](https://github.com/kamui/polished-hacker-news/compare/v0.0.3...v0.0.4)

A design pass over every page, in about a hundred small changes.

### Added

- A "Comments" heading on the comments list, and a "Past" heading on `/front`.
- The new-comments pill has previous and next buttons and counts where you are ("3 of 38
  new"). The comment `n` last landed on keeps a blue bar until the next jump.
- A collapsed comment says how many of its hidden replies are new.
- On phones, a "⋯" button shows the links the phone layout leaves out: hide and past on
  story lists, root, prev and next on comments.
- With "Match my system" on, the settings panel names both the day and night themes.
- A "Skip to content" link, and accessible names for vote arrows, collapse buttons, the logo
  and the settings button.

### Changed

- Story lines show the domain first and separate every item with a dot. On phones they split
  into two lines: domain and author, then points, comments and age.
- Comment and story text is capped at about 75 characters a line, whatever the page width.
- The header spans the reading column. On phones it has two rows, and the nav row slides away
  while you scroll down.
- Classic has Hacker News's orange header bar.
- Each reply's "parent" link is always visible.
- On phones, replies past the fourth level indent 8px a level instead of 18px, so deep
  threads keep room for text.
- Tighter story rows: a 1440×900 screen shows 11 stories instead of 9.
- Secondary text and the accent reach 4.5:1 contrast in every theme, and vote arrows are
  easier to see.
- Profiles, the login page and message pages ("No such item.") match the rest of the site.

### Fixed

- `n` and Shift+N stepped back to the first new comment instead of moving through them.
- Tab now follows the order controls appear on screen, and focus rings are no longer clipped.
- Hovering a thread rail lit the reply's rail instead of the one a click would collapse.
- Quotes no longer show the typed ">" beside their bar.
- Titles no longer wrap onto a line that starts with a space.

## 0.0.3 (2026-11-13)

[Release](https://github.com/kamui/polished-hacker-news/releases/tag/v0.0.3) ·
[Changes since 0.0.2](https://github.com/kamui/polished-hacker-news/compare/v0.0.2...v0.0.3)

### Added

- The polish tin replaces the logo in the header, as it already did the tab icon.
- A "Use the polish tin icon" switch in the settings panel. Turning it off puts back Hacker
  News's own tab icon and header logo at once, without a reload.

### Fixed

- Vote arrows and the reply icon were invisible. Hacker News now sends a Content-Security-Policy
  that blocks `data:` images, which is how those icons were drawn; they now load from files in
  the extension.

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
