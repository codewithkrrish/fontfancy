/* FontFancy — UI wiring. Imports the pure engine and binds it to the DOM.
   Runs init() on import (this script loads at the end of <body>).
   Exported functions exist so the jsdom harness can drive the real module
   graph: setText, setCategory, setSearch, toggleFavourite, copyStyle,
   copyAll, loadSample, clearFavourites, getState.

   Privacy rule, enforced here and in the engine: the user's text is never
   written to localStorage. Only favourites (style ids) and the selected
   category persist. The style cards are built from the engine registry, so
   adding a style to engine.js is enough for it to appear in the UI. */
import {
  SETTINGS_KEY,
  FAVOURITES_KEY,
  DEFAULT_TEXT,
  SAMPLE_TEXTS,
  CATEGORIES,
  CATEGORY_IDS,
  STYLES,
  STYLE_COUNT,
  getStyle,
  transform,
  filterStyles,
  buildCopyAll,
  inputStats,
  parseSettings,
  normalizeSettings,
  loadFavourites,
  saveFavourites,
  toggleFavouriteList,
} from "./engine.js";

const STAR_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.6l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17l-5.7 3.1 1.2-6.4L2.8 9.3l6.4-.8z"/></svg>';

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`FontFancy: missing element #${id}`);
  return el;
}

const els = {
  textInput: $("text-input"),
  inputChars: $("input-chars"),
  sampleRow: $("sample-row"),
  searchInput: $("search-input"),
  categoryRow: $("category-row"),
  favouritesSection: $("favourites-section"),
  favouritesList: $("favourites-list"),
  stylesList: $("styles-list"),
  stylesCount: $("styles-count"),
  previewNote: $("preview-note"),
  copyAllBtn: $("copy-all-btn"),
  clearFavouritesBtn: $("clear-favourites-btn"),
  copyStatus: $("copy-status"),
};

let settings = parseSettings(safeGetItem(SETTINGS_KEY));
let favourites = loadFavourites(safeStorage());
let search = "";
let lastCopyStatus = "";

function safeStorage() {
  try { return window.localStorage; } catch { return null; }
}
function safeGetItem(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSetItem(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode: nothing persists */ }
}

function saveSettings() {
  safeSetItem(SETTINGS_KEY, JSON.stringify(settings));
}
function saveFavs() {
  saveFavourites(safeStorage() || { setItem() {} }, favourites);
}

function currentText() {
  return els.textInput.value;
}

/** The text previews actually show: the user's text, or the sample when
    the box is empty (the note under the grid says so, honestly). */
function displayText() {
  const text = currentText();
  return text === "" ? DEFAULT_TEXT : text;
}

/** Build one style card element. Used for both the main list and the
    favourites list; event handling is delegated on the list containers. */
function buildCard(style) {
  const card = document.createElement("article");
  card.className = "style-card";
  card.dataset.styleId = style.id;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Copy ${style.name} style`);
  card.innerHTML =
    `<div class="style-head">` +
    `<span class="style-name"></span>` +
    `<button type="button" class="fav-btn" data-fav-id="${style.id}" aria-pressed="false"></button>` +
    `</div>` +
    `<p class="style-preview"></p>` +
    `<p class="style-hint">Click to copy</p>`;
  card.querySelector(".style-name").textContent = style.name;
  const favBtn = card.querySelector(".fav-btn");
  favBtn.innerHTML = STAR_SVG;
  favBtn.setAttribute("aria-label", `Add ${style.name} to favourites`);
  return card;
}

/** Render the full style grid once, and the favourites list on change. */
function renderStyles() {
  els.stylesList.innerHTML = "";
  for (const style of STYLES) els.stylesList.appendChild(buildCard(style));
  renderFavourites();
}

/** Rebuild the favourites section from the current favourites list. */
function renderFavourites() {
  els.favouritesList.innerHTML = "";
  for (const id of favourites) {
    const style = getStyle(id);
    if (style) els.favouritesList.appendChild(buildCard(style));
  }
  els.favouritesSection.hidden = favourites.length === 0;
  els.clearFavouritesBtn.hidden = favourites.length === 0;
  syncFavButtons();
}

/** Mark every favourite button active/inactive to match the list. */
function syncFavButtons() {
  document.querySelectorAll(".fav-btn").forEach((btn) => {
    const active = favourites.includes(btn.dataset.favId);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    const style = getStyle(btn.dataset.favId);
    if (style) btn.setAttribute("aria-label", active ? `Remove ${style.name} from favourites` : `Add ${style.name} to favourites`);
  });
}

/** Recompute every preview from the current text, and the counters. */
function updatePreviews() {
  const text = currentText();
  const shown = displayText();
  const stats = inputStats(text);
  els.inputChars.textContent = `${stats.chars.toLocaleString("en-US")} characters · ${stats.words.toLocaleString("en-US")} words`;
  els.previewNote.textContent = text === ""
    ? `Showing sample text (“${DEFAULT_TEXT}”) — type your own text above to style it.`
    : "Previews update live as you type.";
  document.querySelectorAll(".style-card").forEach((card) => {
    const style = getStyle(card.dataset.styleId);
    if (!style) return;
    const preview = card.querySelector(".style-preview");
    if (preview) preview.textContent = transform(shown, style.id);
  });
  applyFilter();
  return stats;
}

/** Show/hide cards by the active category + search; update the count. */
function applyFilter() {
  const visible = new Set(filterStyles(settings.category, search).map((s) => s.id));
  let count = 0;
  els.stylesList.querySelectorAll(".style-card").forEach((card) => {
    const show = visible.has(card.dataset.styleId);
    card.style.display = show ? "" : "none";
    if (show) count += 1;
  });
  const noun = count === 1 ? "style" : "styles";
  els.stylesCount.textContent = search.trim() === "" && settings.category === "all"
    ? `${STYLE_COUNT} styles`
    : `${count} of ${STYLE_COUNT} ${noun}`;
  return count;
}

function syncCategoryPills() {
  els.categoryRow.querySelectorAll(".pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === settings.category);
  });
}

function setStatus(message) {
  lastCopyStatus = message;
  els.copyStatus.textContent = message;
}

/** Write text to the clipboard (Clipboard API, textarea fallback). */
async function writeClipboard(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function flashCopied(card) {
  if (!card) return;
  const hint = card.querySelector(".style-hint");
  if (!hint) return;
  hint.textContent = "Copied";
  card.classList.add("copied");
  window.setTimeout(() => {
    hint.textContent = "Click to copy";
    card.classList.remove("copied");
  }, 1500);
}

/* --- Controls (all exported so the harness can drive them) --- */

function setText(value) {
  els.textInput.value = typeof value === "string" ? value : "";
  updatePreviews();
  return els.textInput.value;
}

function setCategory(category) {
  if (!CATEGORY_IDS.includes(category) && category !== "all") return settings.category;
  settings.category = category;
  syncCategoryPills();
  saveSettings();
  applyFilter();
  return settings.category;
}

function setSearch(query) {
  search = typeof query === "string" ? query : "";
  els.searchInput.value = search;
  applyFilter();
  return search;
}

function toggleFavourite(id) {
  const style = getStyle(id);
  if (!style) return [...favourites];
  favourites = toggleFavouriteList(favourites, id);
  saveFavs();
  renderFavourites();
  updatePreviews();
  setStatus(favourites.includes(id)
    ? `${style.name} added to favourites.`
    : `${style.name} removed from favourites.`);
  return [...favourites];
}

async function copyStyle(id) {
  const style = getStyle(id);
  if (!style) return false;
  const text = currentText();
  if (text.length === 0) {
    setStatus("Nothing to copy yet — type some text first.");
    return false;
  }
  const ok = await writeClipboard(transform(text, id));
  if (ok) {
    setStatus(`Copied the ${style.name} style to the clipboard.`);
    flashCopied(els.stylesList.querySelector(`[data-style-id="${id}"]`));
    return true;
  }
  setStatus("Copy failed in this browser — try selecting the text manually.");
  return false;
}

async function copyAll() {
  const text = currentText();
  if (text.length === 0) {
    setStatus("Nothing to copy yet — type some text first.");
    return false;
  }
  const assembled = buildCopyAll(text);
  const ok = await writeClipboard(assembled);
  if (ok) {
    setStatus(`Copied all ${STYLE_COUNT} styles to the clipboard.`);
    return true;
  }
  setStatus("Copy failed in this browser — try selecting the text manually.");
  return false;
}

function loadSample(sample) {
  const value = SAMPLE_TEXTS.includes(sample) ? sample : DEFAULT_TEXT;
  els.textInput.value = value;
  updatePreviews();
  els.textInput.focus();
  return value;
}

function clearFavourites() {
  favourites = [];
  saveFavs();
  renderFavourites();
  setStatus("Favourites cleared.");
  return true;
}

/* --- Events --- */

els.textInput.addEventListener("input", () => updatePreviews());
els.searchInput.addEventListener("input", (event) => {
  search = event.target.value;
  applyFilter();
});
els.categoryRow.addEventListener("click", (event) => {
  const btn = event.target.closest(".pill");
  if (btn) setCategory(btn.dataset.category);
});
els.sampleRow.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-sample]");
  if (btn) loadSample(btn.dataset.sample);
});
els.stylesList.addEventListener("click", (event) => {
  const favBtn = event.target.closest(".fav-btn");
  if (favBtn) {
    event.stopPropagation();
    toggleFavourite(favBtn.dataset.favId);
    return;
  }
  const card = event.target.closest(".style-card");
  if (card) copyStyle(card.dataset.styleId);
});
els.favouritesList.addEventListener("click", (event) => {
  const favBtn = event.target.closest(".fav-btn");
  if (favBtn) {
    event.stopPropagation();
    toggleFavourite(favBtn.dataset.favId);
    return;
  }
  const card = event.target.closest(".style-card");
  if (card) copyStyle(card.dataset.styleId);
});
function cardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".style-card");
  if (!card) return;
  if (event.target.closest(".fav-btn")) return;
  event.preventDefault();
  copyStyle(card.dataset.styleId);
}
els.stylesList.addEventListener("keydown", cardKeydown);
els.favouritesList.addEventListener("keydown", cardKeydown);
els.copyAllBtn.addEventListener("click", (event) => { event.currentTarget.blur(); copyAll(); });
els.clearFavouritesBtn.addEventListener("click", (event) => { event.currentTarget.blur(); clearFavourites(); });

/* --- Init --- */

function init() {
  settings = normalizeSettings(settings);
  favourites = favourites.filter((id) => getStyle(id));
  renderStyles();
  syncCategoryPills();
  updatePreviews();
}

init();

export {
  setText,
  setCategory,
  setSearch,
  toggleFavourite,
  copyStyle,
  copyAll,
  loadSample,
  clearFavourites,
  updatePreviews,
  getState,
};

function getState() {
  const visible = els.stylesList.querySelectorAll(".style-card");
  let visibleCount = 0;
  visible.forEach((card) => { if (card.style.display !== "none") visibleCount += 1; });
  return {
    text: currentText(),
    category: settings.category,
    search,
    favourites: [...favourites],
    visibleCount,
    totalStyles: STYLE_COUNT,
    lastCopyStatus,
  };
}
