/* FontFancy — pure stylish-text logic. No DOM, no clipboard, no storage
   access: every function here is a plain function of its arguments, so it
   can be unit-tested in Node. The DOM layer (main.js) owns the inputs, the
   preview rendering, the clipboard and localStorage; this module owns the
   style registry, the character transforms, the filtering and the
   favourites helpers (which take a storage object so they are testable).

   Honesty note, baked into the design: these are Unicode look-alike
   characters, not real fonts. A "bold" A here is U+1D400 MATHEMATICAL BOLD
   CAPITAL A — a different character that merely looks bold. That is why
   some styles cannot cover every letter or digit: Unicode simply has no
   superscript Q, no subscript B, and no parenthesised capital A. In those
   cases the character is left unchanged rather than dropped — a style
   never eats input. The README and the on-page "How it works" section say
   the same thing, because a user pasting styled text into an app that
   cannot render a given block deserves to know why it shows as a box. */

export const SETTINGS_KEY = "fontfancy:settings:v1";
export const FAVOURITES_KEY = "fontfancy:favourites:v1";
export const DEFAULT_TEXT = "Hello World";
export const SAMPLE_TEXTS = ["Hello World", "Good Morning", "Your Name Here", "Happy Birthday"];

export const CATEGORIES = [
  { id: "all", label: "All styles" },
  { id: "bold", label: "Bold" },
  { id: "script", label: "Script" },
  { id: "decorative", label: "Decorative" },
  { id: "fun", label: "Fun" },
  { id: "decorations", label: "Decorations" },
];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id).filter((id) => id !== "all");

/* --- Map builders ---------------------------------------------------- */

/**
 * Build a per-character map for the mathematical alphanumeric blocks,
 * which are contiguous runs: capitals at upperBase, lowercase at
 * lowerBase, digits at digitBase (null when the block has no digits).
 * A few capitals live elsewhere in Unicode (e.g. script B is U+212C, not
 * U+1D49D) — those go in the exceptions objects, keyed by the plain
 * letter. Anything not in the map is left unchanged by mapText().
 */
function mathRange(upperBase, lowerBase, digitBase = null, upperExceptions = {}, lowerExceptions = {}) {
  const map = new Map();
  for (let i = 0; i < 26; i += 1) {
    const upper = String.fromCharCode(65 + i);
    const lower = String.fromCharCode(97 + i);
    map.set(upper, upperExceptions[upper] ?? String.fromCodePoint(upperBase + i));
    map.set(lower, lowerExceptions[lower] ?? String.fromCodePoint(lowerBase + i));
  }
  if (digitBase !== null) {
    for (let i = 0; i < 10; i += 1) {
      map.set(String(i), String.fromCodePoint(digitBase + i));
    }
  }
  return map;
}

/** Build a per-character map from a plain object { plain: styled }. */
function explicitMap(entries) {
  return new Map(Object.entries(entries));
}

/** Apply a per-character map, leaving unmapped characters untouched. */
function mapText(text, map) {
  let out = "";
  for (const ch of text) out += map.get(ch) ?? ch;
  return out;
}

/** Apply one combining mark after every non-space character. */
function combining(text, marks) {
  let out = "";
  for (const ch of text) out += ch === " " ? ch : ch + marks;
  return out;
}

/* --- Explicit character maps ------------------------------------------ */

/* Small caps: capitals fold to the same small-cap form as lowercase.
   There is no small-cap X in Unicode; U+1D61 MODIFIER LETTER SMALL X is
   the closest honest stand-in. Q uses U+A7AF LATIN SMALL CAPITAL Q. */
const SMALL_CAPS = explicitMap({
  A: "ᴀ", B: "ʙ", C: "ᴄ", D: "ᴅ", E: "ᴇ", F: "ꜰ", G: "ɢ", H: "ʜ", I: "ɪ",
  J: "ᴊ", K: "ᴋ", L: "ʟ", M: "ᴍ", N: "ɴ", O: "ᴏ", P: "ᴘ", Q: "ꞯ", R: "ʀ",
  S: "ꜱ", T: "ᴛ", U: "ᴜ", V: "ᴠ", W: "ᴡ", X: "ᵡ", Y: "ʏ", Z: "ᴢ",
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ",
  j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ꞯ", r: "ʀ",
  s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "ᵡ", y: "ʏ", z: "ᴢ",
});

/* Superscript: capitals fold to superscript lowercase. Unicode has no
   superscript Q, so Q stays Q — documented, never dropped. */
const SUPERSCRIPT = explicitMap({
  A: "ᵃ", B: "ᵇ", C: "ᶜ", D: "ᵈ", E: "ᵉ", F: "ᶠ", G: "ᵍ", H: "ʰ", I: "ⁱ",
  J: "ʲ", K: "ᵏ", L: "ˡ", M: "ᵐ", N: "ⁿ", O: "ᵒ", P: "ᵖ", R: "ʳ", S: "ˢ",
  T: "ᵗ", U: "ᵘ", V: "ᵛ", W: "ʷ", X: "ˣ", Y: "ʸ", Z: "ᶻ",
  a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ",
  j: "ʲ", k: "ᵏ", l: "ˡ", m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ",
  t: "ᵗ", u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ", z: "ᶻ",
  0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹",
});

/* Subscript: only a subset of letters has a subscript form in Unicode.
   The rest (B, C, D, F, G, Q, W, Y, Z) stay unchanged — honest gap, see
   the README. Capitals fold to subscript lowercase. */
const SUBSCRIPT = explicitMap({
  A: "ₐ", E: "ₑ", H: "ₕ", I: "ᵢ", J: "ⱼ", K: "ₖ", L: "ₗ", M: "ₘ", N: "ₙ",
  O: "ₒ", P: "ₚ", R: "ᵣ", S: "ₛ", T: "ₜ", U: "ᵤ", V: "ᵥ", X: "ₓ",
  a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ",
  o: "ₒ", p: "ₚ", r: "ᵣ", s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
  0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉",
});

/* Circled: enclosed alphanumerics. 0 is U+24EA, 1-9 are U+2460-2468. */
const CIRCLED = (() => {
  const map = new Map();
  for (let i = 0; i < 26; i += 1) {
    map.set(String.fromCharCode(65 + i), String.fromCodePoint(0x24b6 + i));
    map.set(String.fromCharCode(97 + i), String.fromCodePoint(0x24d0 + i));
  }
  map.set("0", "⓪");
  for (let i = 1; i <= 9; i += 1) map.set(String(i), String.fromCodePoint(0x2460 + i - 1));
  return map;
})();

/* Parenthesised: only lowercase parenthesised letters exist in Unicode,
   so capitals fold to the lowercase form. Digits stay unchanged. */
const PARENTHESISED = (() => {
  const map = new Map();
  for (let i = 0; i < 26; i += 1) {
    const styled = String.fromCodePoint(0x249c + i);
    map.set(String.fromCharCode(65 + i), styled);
    map.set(String.fromCharCode(97 + i), styled);
  }
  return map;
})();

/* Fullwidth: ASCII letters and digits shifted into the fullwidth block. */
const FULLWIDTH = (() => {
  const map = new Map();
  for (let i = 0; i < 26; i += 1) {
    map.set(String.fromCharCode(65 + i), String.fromCodePoint(0xff21 + i));
    map.set(String.fromCharCode(97 + i), String.fromCodePoint(0xff41 + i));
  }
  for (let i = 0; i < 10; i += 1) map.set(String(i), String.fromCodePoint(0xff10 + i));
  return map;
})();

/* Greek look-alikes: each Latin letter mapped to the Greek letter it most
   resembles. R and P both land on rho, V and N both on nu — look-alikes
   are not a cipher, so a couple of collisions are fine and documented. */
const GREEK = explicitMap({
  A: "Α", B: "Β", C: "Ϲ", D: "Δ", E: "Ε", F: "Ϝ", G: "Γ", H: "Η", I: "Ι",
  J: "ϳ", K: "Κ", L: "Λ", M: "Μ", N: "Ν", O: "Ο", P: "Ρ", Q: "Ϙ", R: "Ρ",
  S: "Σ", T: "Τ", U: "Υ", V: "ϒ", W: "ω", X: "Χ", Y: "Υ", Z: "Ζ",
  a: "α", b: "β", c: "ϲ", d: "δ", e: "ε", f: "φ", g: "γ", h: "η", i: "ι",
  j: "ϳ", k: "κ", l: "λ", m: "μ", n: "ν", o: "ο", p: "ρ", q: "ϙ", r: "ρ",
  s: "σ", t: "τ", u: "υ", v: "ν", w: "ω", x: "χ", y: "ψ", z: "ζ",
});

/* Cyrillic look-alikes: Latin letters that have a Cyrillic twin. */
const CYRILLIC = explicitMap({
  A: "А", B: "В", C: "С", D: "Д", E: "Е", F: "Ғ", G: "Г", H: "Н", I: "І",
  J: "Ј", K: "К", L: "Л", M: "М", N: "И", O: "О", P: "Р", Q: "Ԛ", R: "Я",
  S: "Ѕ", T: "Т", U: "У", V: "Ѵ", W: "Ш", X: "Х", Y: "Ү", Z: "З",
  a: "а", b: "в", c: "с", d: "д", e: "е", f: "ғ", g: "г", h: "н", i: "і",
  j: "ј", k: "к", l: "л", m: "м", n: "и", o: "о", p: "р", q: "ԛ", r: "я",
  s: "ѕ", t: "т", u: "у", v: "ѵ", w: "ш", x: "х", y: "ү", z: "з",
});

/* Cherokee syllabary letters that resemble Latin capitals. Cherokee has
   no case distinction here, so lowercase folds to the same glyphs. */
const CHEROKEE = explicitMap({
  A: "Ꭺ", B: "Ᏼ", C: "Ꮯ", D: "Ꭰ", E: "Ꭼ", F: "Ꮀ", G: "Ꮆ", H: "Ꮋ", I: "Ꭵ",
  J: "Ꮰ", K: "Ꮶ", L: "Ꮮ", M: "Ꮇ", N: "Ꮑ", O: "Ꭴ", P: "Ꭾ", Q: "Ꮳ", R: "Ꮢ",
  S: "Ꮥ", T: "Ꭲ", U: "Ꮜ", V: "Ꮙ", W: "Ꮤ", X: "Ꮵ", Y: "Ꭹ", Z: "Ꮓ",
  a: "Ꭺ", b: "Ᏼ", c: "Ꮯ", d: "Ꭰ", e: "Ꭼ", f: "Ꮀ", g: "Ꮆ", h: "Ꮋ", i: "Ꭵ",
  j: "Ꮰ", k: "Ꮶ", l: "Ꮮ", m: "Ꮇ", n: "Ꮑ", o: "Ꭴ", p: "Ꭾ", q: "Ꮳ", r: "Ꮢ",
  s: "Ꮥ", t: "Ꭲ", u: "Ꮜ", v: "Ꮙ", w: "Ꮤ", x: "Ꮵ", y: "Ꭹ", z: "Ꮓ",
});

/* Runic (Elder Futhark): C and K share ᚲ, as they do in the runes. */
const RUNIC = explicitMap({
  A: "ᚨ", B: "ᛒ", C: "ᚲ", D: "ᛞ", E: "ᛖ", F: "ᚠ", G: "ᚷ", H: "ᚻ", I: "ᛁ",
  J: "ᛃ", K: "ᚴ", L: "ᛚ", M: "ᛗ", N: "ᚾ", O: "ᛟ", P: "ᛈ", Q: "ᛩ", R: "ᚱ",
  S: "ᛊ", T: "ᛏ", U: "ᚢ", V: "ᚡ", W: "ᚹ", X: "ᛪ", Y: "ᛦ", Z: "ᛉ",
  a: "ᚨ", b: "ᛒ", c: "ᚲ", d: "ᛞ", e: "ᛖ", f: "ᚠ", g: "ᚷ", h: "ᚻ", i: "ᛁ",
  j: "ᛃ", k: "ᚴ", l: "ᛚ", m: "ᛗ", n: "ᚾ", o: "ᛟ", p: "ᛈ", q: "ᛩ", r: "ᚱ",
  s: "ᛊ", t: "ᛏ", u: "ᚢ", v: "ᚡ", w: "ᚹ", x: "ᛪ", y: "ᛦ", z: "ᛉ",
});

/* Braille: the standard English braille alphabet. Braille has no case,
   so capitals fold to the same cells; digits use the number sign U+2800
   prefix plus the a-j cells, exactly as braille does. */
const BRAILLE = explicitMap({
  A: "⠁", B: "⠃", C: "⠉", D: "⠙", E: "⠑", F: "⠋", G: "⠛", H: "⠓", I: "⠊",
  J: "⠚", K: "⠅", L: "⠇", M: "⠍", N: "⠝", O: "⠕", P: "⠏", Q: "⠟", R: "⠗",
  S: "⠎", T: "⠞", U: "⠥", V: "⠧", W: "⠺", X: "⠭", Y: "⠽", Z: "⠵",
  a: "⠁", b: "⠃", c: "⠉", d: "⠙", e: "⠑", f: "⠋", g: "⠛", h: "⠓", i: "⠊",
  j: "⠚", k: "⠅", l: "⠇", m: "⠍", n: "⠝", o: "⠕", p: "⠏", q: "⠟", r: "⠗",
  s: "⠎", t: "⠞", u: "⠥", v: "⠧", w: "⠺", x: "⠭", y: "⠽", z: "⠵",
  0: "⠼⠚", 1: "⠼⠁", 2: "⠼⠃", 3: "⠼⠉", 4: "⠼⠙", 5: "⠼⠑",
  6: "⠼⠋", 7: "⠼⠛", 8: "⠼⠓", 9: "⠼⠊",
});

/* Leet: the classic substitutions; every other letter stays itself. */
const LEET = explicitMap({
  A: "4", B: "8", E: "3", G: "6", I: "1", L: "1", O: "0", S: "5", T: "7", Z: "2",
  a: "4", b: "8", e: "3", g: "6", i: "1", l: "1", o: "0", s: "5", t: "7", z: "2",
});

/* Upside-down: flipped look-alikes. B uses a Deseret capital (U+10412),
   Q uses Greek capital Tonos Omicron — both are the glyphs the
   upside-down generators settled on years ago, not typos. 2 and 5 both
   flip to something like Ƨ, so 5 maps to Ƽ instead to keep them apart. */
const UPSIDE_DOWN = explicitMap({
  A: "∀", B: "𐐒", C: "Ↄ", D: "ᗡ", E: "Ǝ", F: "Ⅎ", G: "⅁", H: "H", I: "I",
  J: "ſ", K: "⋊", L: "⅃", M: "ꟽ", N: "N", O: "O", P: "Ԁ", Q: "Ό", R: "ᴚ",
  S: "S", T: "⊥", U: "∩", V: "Λ", W: "M", X: "X", Y: "⅄", Z: "Z",
  a: "ɐ", b: "q", c: "ɔ", d: "p", e: "ǝ", f: "ɟ", g: "ƃ", h: "ɥ", i: "ᴉ",
  j: "ɾ", k: "ʞ", l: "ʅ", m: "ɯ", n: "u", o: "o", p: "d", q: "b", r: "ɹ",
  s: "s", t: "ʇ", u: "n", v: "ʌ", w: "ʍ", x: "x", y: "ʎ", z: "z",
  0: "0", 1: "Ɩ", 2: "Ƨ", 3: "Ɛ", 4: "ᔭ", 5: "Ƽ", 6: "9", 7: "ㄥ", 8: "8", 9: "6",
});

/* Morse code: letters and digits to dots and dashes, joined with a
   space; word spaces become " / " so word breaks survive the copy. */
const MORSE = explicitMap({
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.",
  h: "....", i: "..", j: ".---", k: "-.-", l: ".-..", m: "--", n: "-.",
  o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-", u: "..-",
  v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....",
  6: "-....", 7: "--...", 8: "---..", 9: "----.",
});

/* --- Style-specific transforms --------------------------------------- */

function rot13(text) {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 65 && code <= 90) out += String.fromCodePoint(((code - 65 + 13) % 26) + 65);
    else if (code >= 97 && code <= 122) out += String.fromCodePoint(((code - 97 + 13) % 26) + 97);
    else out += ch;
  }
  return out;
}

function swapCase(text) {
  let out = "";
  for (const ch of text) {
    out += ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
  }
  return out;
}

/* Alternating case counts letters only, so spaces and digits never shift
   the pattern — "Hello World" becomes "HeLlO WoRlD", not "HeLlO wOrLd". */
function alternatingCase(text) {
  let out = "";
  let letterIndex = 0;
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) {
      out += letterIndex % 2 === 0 ? ch.toUpperCase() : ch.toLowerCase();
      letterIndex += 1;
    } else {
      out += ch;
    }
  }
  return out;
}

function spacedOut(text) {
  return [...text].join(" ");
}

function aesthetic(text) {
  return [...mapText(text, FULLWIDTH)].join(" ");
}

function morse(text) {
  const parts = [];
  for (const ch of text) {
    if (ch === " ") parts.push("/");
    else parts.push(MORSE.get(ch) ?? ch);
  }
  return parts.join(" ");
}

/* --- The style registry ------------------------------------------------
   kind: "map" (1:1 per-character), "combining" (letter + mark(s)),
   "custom" (anything else: Morse, spaced, case tricks). The harness uses
   kind to pick the right length bounds. */
function mapStyle(id, name, category, map) {
  return { id, name, category, kind: "map", apply: (text) => mapText(text, map) };
}
function combiningStyle(id, name, category, marks) {
  return { id, name, category, kind: "combining", apply: (text) => combining(text, marks) };
}
function customStyle(id, name, category, apply) {
  return { id, name, category, kind: "custom", apply };
}

export const STYLES = [
  // Bold — the mathematical alphanumeric blocks.
  mapStyle("bold", "Bold", "bold", mathRange(0x1d400, 0x1d41a, 0x1d7ce)),
  mapStyle("italic", "Italic", "bold", mathRange(0x1d434, 0x1d44e)),
  mapStyle("bold-italic", "Bold Italic", "bold", mathRange(0x1d468, 0x1d482)),
  mapStyle("sans", "Sans Serif", "bold", mathRange(0x1d5a0, 0x1d5ba, 0x1d7e2)),
  mapStyle("sans-bold", "Sans Bold", "bold", mathRange(0x1d5d4, 0x1d5ee, 0x1d7ec)),
  mapStyle("sans-italic", "Sans Italic", "bold", mathRange(0x1d608, 0x1d622)),
  mapStyle("sans-bold-italic", "Sans Bold Italic", "bold", mathRange(0x1d63c, 0x1d656)),
  mapStyle("monospace", "Monospace", "bold", mathRange(0x1d670, 0x1d68a, 0x1d7f6)),
  mapStyle("double-struck", "Double-Struck", "bold", mathRange(0x1d538, 0x1d552, 0x1d7d8,
    { C: "ℂ", H: "ℍ", N: "ℕ", P: "ℙ", Q: "ℚ", R: "ℝ", Z: "ℤ" })),
  // Script — calligraphic and blackletter blocks.
  mapStyle("script", "Script", "script", mathRange(0x1d49c, 0x1d4b6, null,
    { B: "ℬ", E: "ℰ", F: "ℱ", H: "ℋ", I: "ℐ", L: "ℒ", M: "ℳ", R: "ℛ" })),
  mapStyle("bold-script", "Bold Script", "script", mathRange(0x1d4d0, 0x1d4ea)),
  mapStyle("fraktur", "Fraktur", "script", mathRange(0x1d504, 0x1d51e, null,
    { C: "ℭ", H: "ℌ", I: "ℑ", R: "ℜ", Z: "ℨ" })),
  mapStyle("bold-fraktur", "Bold Fraktur", "script", mathRange(0x1d56c, 0x1d586)),
  // Decorative — other alphabets and enclosed forms.
  mapStyle("fullwidth", "Fullwidth", "decorative", FULLWIDTH),
  mapStyle("small-caps", "Small Caps", "decorative", SMALL_CAPS),
  mapStyle("superscript", "Superscript", "decorative", SUPERSCRIPT),
  mapStyle("subscript", "Subscript", "decorative", SUBSCRIPT),
  mapStyle("circled", "Circled", "decorative", CIRCLED),
  mapStyle("parenthesised", "Parenthesised", "decorative", PARENTHESISED),
  customStyle("aesthetic", "Aesthetic", "decorative", aesthetic),
  mapStyle("greek", "Greek Lookalikes", "decorative", GREEK),
  mapStyle("cyrillic", "Cyrillic Lookalikes", "decorative", CYRILLIC),
  mapStyle("cherokee", "Cherokee", "decorative", CHEROKEE),
  mapStyle("runic", "Runic", "decorative", RUNIC),
  mapStyle("braille", "Braille", "decorative", BRAILLE),
  // Fun — ciphers, case tricks and code.
  mapStyle("leet", "Leet", "fun", LEET),
  customStyle("rot13", "ROT13", "fun", rot13),
  customStyle("alternating-case", "Alternating Case", "fun", alternatingCase),
  customStyle("spaced-out", "Spaced Out", "fun", spacedOut),
  customStyle("morse", "Morse Code", "fun", morse),
  mapStyle("upside-down", "Upside Down", "fun", UPSIDE_DOWN),
  customStyle("reversed-case", "Reversed Case", "fun", swapCase),
  // Decorations — combining marks over plain letters.
  combiningStyle("strikethrough", "Strikethrough", "decorations", "̶"),
  combiningStyle("underline", "Underline", "decorations", "̲"),
  combiningStyle("double-underline", "Double Underline", "decorations", "̳"),
  combiningStyle("overline", "Overline", "decorations", "̅"),
  combiningStyle("slash", "Slash Through", "decorations", "̸"),
  combiningStyle("wavy-underline", "Wavy Underline", "decorations", "̰"),
  combiningStyle("dot-below", "Dot Below", "decorations", "̣"),
  combiningStyle("dot-above", "Dot Above", "decorations", "̇"),
  combiningStyle("tilde-above", "Tilde Above", "decorations", "̃"),
  combiningStyle("macron-below", "Macron Below", "decorations", "̱"),
  combiningStyle("bubble", "Bubble", "decorations", "⃝"),
  combiningStyle("boxed", "Boxed", "decorations", "⃞"),
  combiningStyle("crossed", "Crossed Out", "decorations", "̶̸"),
  combiningStyle("strike-underline", "Strike + Underline", "decorations", "̶̲"),
  combiningStyle("acute", "Acute Accent", "decorations", "́"),
  combiningStyle("grave", "Grave Accent", "decorations", "̀"),
  combiningStyle("circumflex", "Circumflex", "decorations", "̂"),
  combiningStyle("umlaut", "Umlaut", "decorations", "̈"),
  combiningStyle("cedilla", "Cedilla", "decorations", "̧"),
];

export const STYLE_COUNT = STYLES.length;

const STYLE_BY_ID = new Map(STYLES.map((style) => [style.id, style]));

/** Look a style up by id; unknown ids return undefined. */
export function getStyle(id) {
  return STYLE_BY_ID.get(id);
}

/** All styles, in registry order. */
export function getStyles() {
  return [...STYLES];
}

/**
 * Transform `text` with the named style. Unknown style ids return the
 * text unchanged; non-string input is treated as empty. Empty input
 * always yields empty output.
 */
export function transform(text, styleId) {
  const safe = typeof text === "string" ? text : "";
  if (safe === "") return "";
  const style = getStyle(styleId);
  if (!style) return safe;
  return style.apply(safe);
}

/** Transform `text` with every style: [{ id, name, output }]. */
export function transformAll(text) {
  return STYLES.map((style) => ({ id: style.id, name: style.name, output: transform(text, style.id) }));
}

/**
 * Filter styles by category ("all" = everything) and a name search
 * (case-insensitive substring; empty search matches all). Unknown
 * categories fall back to "all".
 */
export function filterStyles(category = "all", search = "") {
  const cat = CATEGORY_IDS.includes(category) ? category : "all";
  const needle = typeof search === "string" ? search.trim().toLowerCase() : "";
  return STYLES.filter((style) => {
    if (cat !== "all" && style.category !== cat) return false;
    if (needle !== "" && !style.name.toLowerCase().includes(needle)) return false;
    return true;
  });
}

/**
 * Assemble the "Copy all styles" text: one "Name: transformed" line per
 * style. Empty input yields "" so the UI can refuse honestly instead of
 * copying a list of bare names.
 */
export function buildCopyAll(text) {
  const safe = typeof text === "string" ? text : "";
  if (safe === "") return "";
  return STYLES.map((style) => `${style.name}: ${transform(safe, style.id)}`).join("\n");
}

/** Word/char stats for the input box. */
export function inputStats(text) {
  const safe = typeof text === "string" ? text : "";
  return {
    chars: safe.length,
    words: safe.length === 0 ? 0 : safe.trim().split(/\s+/).filter(Boolean).length,
  };
}

/* --- Settings + favourites (storage is injected, so tests can fake it) --- */

export const DEFAULT_SETTINGS = { category: "all" };

/** Merge a partial settings object onto the defaults. */
export function normalizeSettings(input) {
  const raw = input && typeof input === "object" ? input : {};
  return {
    category: CATEGORY_IDS.includes(raw.category) ? raw.category : DEFAULT_SETTINGS.category,
  };
}

/** Parse a stored settings blob; garbage in, defaults out. */
export function parseSettings(raw) {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Parse a stored favourites blob into a deduped list of known style ids,
 * in stored order. Anything else (garbage JSON, unknown ids, non-arrays)
 * yields an empty list.
 */
export function parseFavourites(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const out = [];
    for (const id of parsed) {
      if (typeof id === "string" && STYLE_BY_ID.has(id) && !seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Read favourites from a storage object ({ getItem }). Never throws. */
export function loadFavourites(storage) {
  try {
    return parseFavourites(storage.getItem(FAVOURITES_KEY));
  } catch {
    return [];
  }
}

/** Write favourites to a storage object ({ setItem }). Never throws. */
export function saveFavourites(storage, favourites) {
  try {
    storage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    return true;
  } catch {
    return false;
  }
}

/** Toggle one id in a favourites list; returns a new list (no mutation). */
export function toggleFavouriteList(favourites, id) {
  if (!STYLE_BY_ID.has(id)) return [...favourites];
  return favourites.includes(id)
    ? favourites.filter((item) => item !== id)
    : [...favourites, id];
}

/** Is this style in the favourites list? */
export function isFavourite(favourites, id) {
  return Array.isArray(favourites) && favourites.includes(id);
}
