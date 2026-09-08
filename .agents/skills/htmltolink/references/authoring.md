# Authoring guide: writing HTML worth sharing

Read this before generating HTML that will be published with htmltolink. The
genre is specific: **one self-contained file, opened cold by strangers, usually
on a phone, arriving from a link in a chat app**. Every choice below follows
from that.

## The `<head>` recipe

The unfurl (the preview card in WhatsApp / Slack / iMessage / Twitter) is the
page's first impression, and most generated pages skip it. Include all of this:

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trip Plan: Kyoto in 4 Days</title>
  <meta name="description" content="Day-by-day itinerary with maps and costs.">
  <meta property="og:title" content="Trip Plan: Kyoto in 4 Days">
  <meta property="og:description" content="Day-by-day itinerary with maps and costs.">
  <meta property="og:type" content="website">
  <meta name="theme-color" content="#1a1a2e">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗺️</text></svg>">
</head>
```

Notes:

- `<title>` names the page ("Q3 Sales Recap"), it doesn't describe it
  ("A page showing sales data"). Never "Document" or "Untitled".
- `og:image` is optional (there's nowhere to host a separate image), but
  `og:title` + `og:description` alone already produce a proper preview card.

## The favicon: pick an emoji that is about the page

**Always ship one.** htmltolink injects its own brand mark into any page served
without a `<link rel="icon">`, so a page that skips it wears the platform's tab
icon instead of its own. Your one line wins, because the injection only fires
when the page has no icon of its own.

This matters more than it sounds. The tab icon is how someone finds the page
again in a row of fifteen tabs, and it is the only picture most link-shares
ever get.

The line, with the emoji swapped:

```html
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🗺️</text></svg>">
```

**How to pick.** Name the page's subject in one noun, then pick the emoji a
person would draw for that noun. Concrete beats clever:

| The page is | Good | Not |
| --- | --- | --- |
| Kyoto trip itinerary | 🗺️ 🇯🇵 ⛩️ | ✨ (says nothing) |
| Q3 sales recap | 📈 | 📄 (every page is a document) |
| Wedding details & RSVP | 💍 💐 | ❤️ (generic) |
| Recipe for ramen | 🍜 | 🍽️ (the category, not the dish) |
| Product changelog | 🚀 📦 | 🔔 |
| Personal résumé | 👤 🧑‍💻 | 📎 |
| Party invite | 🎉 | 🥳 (face emoji read as noise at 16px) |
| D&D campaign notes | 🐉 | 🎲 |

Rules that hold up:

- **Specific over categorical.** The dish, not "food". The chart, not "document".
- **One emoji, one glyph.** Skip ZWJ sequences (👨‍👩‍👧‍👦, 🏳️‍🌈) and keycaps.
  They render inconsistently at 16px and some platforms drop them entirely.
- **Read it at 16px.** Anything with fine internal detail (🧬, 🗓️ with numbers,
  most face emoji) turns to mush. Bold silhouettes survive.
- **Match the title, not the vibe.** If the `<title>` is "Kyoto in 4 Days", 🗺️
  is right and ✨ is decoration.
- **Skin-tone and flag modifiers** are fine but rarely add anything at that size.

If the page has a real brand mark, use it instead: inline the SVG in the same
`data:` URI, or point `href` at an https URL that will stay up. Emoji is the
default because it costs one line and no request, not because it's the ceiling.

**Syntax gotchas.** The value is a URL, so:

- Quotes inside the SVG must be percent-encoded as `%22`. Unencoded `"` ends the
  HTML attribute and the icon silently vanishes.
- Keep `y=".9em"`, which sits the glyph on the baseline. Without it the emoji
  is clipped at the top of the box.
- `#` inside an inline SVG (a hex color, say) must be `%23`.
- Use `rel="icon"`. `rel="apple-touch-icon"` alone does not count as a favicon,
  and htmltolink will still inject its mark alongside it.
- `data:` icons work under the platform's strictest serve mode, so this line is
  always safe.

## Layout: mobile first, one column

Design for a ~375px-wide screen, then let it breathe on desktop:

- Wrap content in a container: `max-width: 42rem; margin: 0 auto;
  padding: 1.5rem;` (wider, ~64–72rem, for dashboards/tables).
- Base font size 16px minimum; line-height around 1.6 for body text.
- The page body must never scroll horizontally. Anything intrinsically wide
  (tables, code blocks, big diagrams) goes inside its own `overflow-x: auto`
  wrapper.
- Images: `max-width: 100%; height: auto;`.
- Tap targets (buttons, links acting as buttons) at least ~44px tall.

## Color and dark mode

Define colors once as custom properties and support both themes. A page opened
from a chat at night in light-blast white feels broken:

```css
:root {
  --bg: #ffffff; --fg: #1a1a1a; --muted: #6b7280;
  --accent: #2563eb; --surface: #f4f4f5;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111114; --fg: #e7e7ea; --muted: #9ca3af;
    --accent: #60a5fa; --surface: #1c1c21;
  }
}
body { background: var(--bg); color: var(--fg); }
```

Use the tokens everywhere; never hardcode a color that only works in one theme.
A page with a deliberate single look (e.g. a dark poster) may skip the media
query but must still set background and text colors explicitly.

## Typography

The system font stack costs zero bytes and zero requests:

```css
font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

A Google Fonts `<link>` is fine when the page wants a distinct voice (one
family, two weights, always with a fallback stack), but it's an external
dependency; the system stack is the safe default.

## Don't let it read as AI-generated

A shared page is judged in about two seconds. Readers now recognize the house
style of a generated page, and recognizing it costs the page its credibility
before a word gets read. The tells are specific and easy to avoid.

**In the writing:**

- **The em dash.** This is the loudest tell of the moment. One per page is
  plenty; most pages need none. A comma, a full stop, or a colon does the job,
  and the sentence usually improves. Watch for the paired-dash aside in
  particular, since that is the construction that gives it away.
- **"It's not just X, it's Y."** Same for "not only... but also". State what the
  thing is and stop.
- **Vocabulary that only appears in generated text:** delve, leverage, robust,
  seamless, elevate, unlock, harness, "in today's fast-paced world", "game
  changer", "at its core", "the landscape of". Use the plain word.
- **Everything in threes.** "Fast, simple, and reliable." Real writing has lists
  of two and lists of five.
- **The closing recap.** A final paragraph that restates the page adds nothing.
  End on the last real point.
- **"It's important to note that"** and other throat-clearing. Delete the
  preamble, keep the sentence.
- **Bold lead-ins on every bullet.** Bold the ones that carry weight. If they all
  do, none do.

**In the design:**

- **The purple-to-blue hero gradient.** `#667eea → #764ba2` and its neighbors
  are instantly recognizable as machine-chosen. Pick colors that come from the
  page's subject.
- **Emoji as section headings or bullet markers** (🚀 ✨ 🎯 next to every
  heading). One emoji as a favicon is useful. A grid of them is a signature.
- **Three feature cards in a row**, each with a circular icon and a two-line
  description, when the content is not actually three parallel features.
- **Uniform cards for everything.** The same rounded box with the same shadow
  around every section flattens the page's real structure. Vary the treatment,
  or drop the boxes and use whitespace.
- **Filler that survived to publication:** "Your Company Name", "Feature One",
  "Lorem ipsum", a placeholder date. Ship real content or cut the section.

The underlying rule: write and design for the specific subject in front of you.
Every item above is what a page looks like when it is assembled from a generic
template instead.

## Self-contained means self-contained

The page is published as one file with nothing next to it:

- All CSS in `<style>`, all JS in `<script>`: no `./style.css`, no `./app.js`.
- Images either from an https URL that will stay up, or embedded as `data:`
  URIs. Embedded images count toward the 10 MB cap, so keep them small
  (compress, resize; prefer SVG for graphics).
- Every external URL must be `https://`. The page is served over https and
  browsers silently block `http://` sub-resources.
- Icons: inline SVG or emoji, not an icon-font CDN.

## Interactivity: client-side only

There is no backend. What works, and what to reach for:

- **State that persists per visitor** (a checklist, a filter, a draft):
  `localStorage`, with every read/write in `try/catch` and the page rendering
  correctly when storage is empty or unavailable.
- **Libraries**: load from a major CDN (cdnjs, jsdelivr), pinned to an exact
  version, script tag placed before the inline script that uses it. Don't pull
  a framework for what 30 lines of vanilla JS can do.
- **Charts/diagrams**: inline SVG, or a pinned CDN chart library.
- The page should still show its content if JS fails to load. Render the
  content in HTML and use JS to enhance it, not to construct it, whenever
  practical.

**What the platform cannot do.** Design around these, don't ship them broken:

- No form submissions: there is no server to receive a `POST`. If the user
  wants to "collect" something, use a `mailto:` link, a copy-to-clipboard
  button, or link to a real form service, and say which you chose.
- No multi-page navigation: it's one URL. Use in-page sections with anchor
  links, or tabs toggled by JS.
- No shared or server state: nothing one visitor does is visible to another.
  Don't build a poll or counter that pretends otherwise.
- No secrets: everything in the file is public, including anything in the JS.

## Accessibility floor

- One `<h1>`, headings in order, semantic elements (`<nav>`, `<main>`,
  `<button>` for actions, not clickable `<div>`s).
- `alt` text on meaningful images; `alt=""` on decorative ones.
- Text contrast ≥ 4.5:1 against its background in both themes.
- Visible focus states; don't `outline: none` without a replacement.

## Before you publish

Run the pre-publish checklist in SKILL.md. Then reread the page top to bottom
once as a stranger on a phone: does the first screen say what this is and why
you'd scroll?
