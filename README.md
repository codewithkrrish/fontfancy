# FontFancy

I kept running into the same problem every time I wanted a fancy name for a game profile or an Instagram bio: the generators out there were either drowning in pop-up ads, or they gave you ten styles and called it a day. So I built the one I actually wanted — 51 styles, no ads, no account, and the page never talks to a server at all. Type something, tap the style you like, paste it wherever you want.

## What you get

- **51 styles that actually work.** Bold, italic, script, fraktur, monospace, double-struck, fullwidth, small caps, circled, parenthesised, superscript, subscript, Greek and Cyrillic look-alikes, Cherokee, runes, braille, leet, ROT13, Morse code, upside down — plus a whole set of combining-mark decorations (strikethrough, underline, bubble, boxed, and a few accent styles).
- **Click any style to copy it.** The card flashes "Copied" so you know it worked. There is also a "Copy all styles" button that gives you the full list as `Name: styled text` lines, one per style.
- **Favourites that stick around.** Star the styles you keep coming back to and they pin to a favourites section at the top. Only the favourites (and which category you picked) are saved, in your own browser.
- **Search and categories.** Five categories — Bold, Script, Decorative, Fun, Decorations — plus a search box that filters by style name.
- **Sample chips.** "Hello World", "Good Morning", "Your Name Here", "Happy Birthday" — one tap fills the box.

## A word on what this is (and is not)

This tool does not change your font. It swaps your letters for Unicode characters that *look* like a different font — a bold A here is U+1D400, a completely different character that happens to look bold. That is the whole trick, and it is also the reason the styled text works in bios, usernames and chats: anywhere plain text works, this works.

It also means two honest limits:

1. **Some apps will not render every character.** The common styles (bold, italic, script, fullwidth) show up almost everywhere. The rarer blocks — Cherokee, runes, braille, some double-struck digits — can show as a box on older phones or in apps with thin font coverage. If a style matters to you, paste it into the app first and check.
2. **A few letters have no styled form at all.** Unicode simply has no superscript Q and no subscript B, C, D, F, G, Q, W, Y or Z. When a style cannot cover a letter, FontFancy leaves that letter plain instead of dropping it — your text never loses characters, it just looks a little less dressed up in those spots.

Your text is never saved. Reload the page and the box is back to the sample; only your favourites and category choice persist, on this device, in localStorage.

## Try it locally

No build step, nothing to install. ES modules need a real origin, so serve the folder over HTTP rather than opening the file directly:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## How the code is organised

- `js/engine.js` — the pure logic, no DOM anywhere: the style registry (every style is a character map, a combining-mark rule, or a small custom transform), the category/search filter, the "copy all" assembly, and the favourites helpers, which take a storage object so they can be tested with a fake. Fully unit-tested in Node.
- `js/main.js` — the DOM wiring: builds the style cards from the registry, live previews, search and category pills, sample chips, favourites persistence, clipboard copy with a textarea fallback.
- `index.html` / `styles.css` — the page and the PixelPress design tokens (dark background, red accent, Inter with a system fallback stack, no webfont fetch).

## Privacy

Everything runs in your browser. Your text is never uploaded or stored anywhere — the only things saved are your favourite style ids and your selected category, in your own browser's localStorage.
