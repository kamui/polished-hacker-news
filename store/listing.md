# Store listing

Copy for the Chrome Web Store and Microsoft Edge Add-ons dashboards. Both stores take the same
`polished-hacker-news.zip` (`bun run zip`) and the 1280×800 screenshots in this folder.

| File | Where it goes |
| --- | --- |
| `store-icon-128.png` | Chrome's "Store icon". The same image is the 128px icon inside the zip. |
| `promo-small-440x280.png` | Chrome's "Small promo tile". 24-bit PNG, no alpha. |
| `logo-300.png` | Edge's "Extension Store logo". |

## Name

Polished Hacker News

## Short description

A calm, readable Hacker News: dark themes, clear comment threads, and markers for what you've read and what's new.

## Description

Polished Hacker News restyles news.ycombinator.com for reading. It keeps the site's own pages, voting and collapsing, and changes how they look.

• Themes: Light, Classic, Slate, Dark and true Black, with an option to follow your system's light or dark setting.
• Type: Inter or Source Serif 4, with live sliders for text size, line spacing and page width.
• Comment threads: every comment has a rail down to its last reply. Click a rail to collapse the thread; point at it to light the thread up. There is no limit on nesting depth.
• Votes you can see: anything you upvoted keeps a filled orange arrow. Click it to undo.
• Read and new: stories you have opened are dimmed, with a count of comments added since your last visit. On a story, comments posted since you last loaded it are tagged "new", and the n key steps through them.
• Search from the header, open links in a new tab, keep the header in view, an "OP" tag on the submitter's comments.
• One click back to the original design.

Fast by design: almost everything is CSS, and the page is not rebuilt, so long threads stay quick and other Hacker News extensions keep working.

Private: no network requests, no analytics, no account. The only permission is storage, used for your settings and for the list of stories you have opened, which stays on your device.

Open source under the MIT licence: https://github.com/kamui/polished-hacker-news

Polished Hacker News is an independent project. It is not affiliated with Y Combinator or Hacker News.

## Category

Chrome: Tools (or Productivity → Tools). Edge: Productivity.

## Language

English

## Privacy answers

**Single purpose.** Changes the appearance of news.ycombinator.com and adds reading aids there: themes, typography, threaded comment rails, and markers for read stories and new comments.

**Why `storage`.** Saves the user's display settings (theme, font, sizes, toggles) with `chrome.storage.sync`, and keeps a local list of the Hacker News stories they opened (story id, comment count, newest comment id, time of visit) with `chrome.storage.local`, to dim read stories and mark new comments. Nothing leaves the browser.

**Why it runs on news.ycombinator.com (host permission / content scripts).** The extension's stylesheet and scripts are injected only on `https://news.ycombinator.com/*`, the one site it restyles. It reads the page's markup to style it and to detect new comments. It runs nowhere else.

**Remote code.** No. All code is in the package.

**Data collection.** None. The extension makes no network requests. Tick no data categories, and certify that data is not sold, not used for unrelated purposes, and not used for creditworthiness.

**Privacy policy URL.** https://github.com/kamui/polished-hacker-news#privacy

## Notes for reviewers (Edge "Notes for certification")

No account or setup is needed. Open https://news.ycombinator.com and the restyle applies. The two-slider button at the right of the header opens the settings; "Show the original design" there turns the restyle off. Voting and replying need a Hacker News account but are the site's own features, unchanged by the extension.
