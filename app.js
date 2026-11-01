import { CONFIG } from "./config.js";
import { filterPrompts, effortLabel, workIqLabel, validateCatalogue, formUrl, safeHttpsUrl, ratingFormUrl, createFavouritesStore, readLibraryUrl, libraryUrl, favouritesStorageKey } from "./core.js";

const $ = selector => document.querySelector(selector);
const paths = {
  grid: '<rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><rect x="15" y="15" width="6" height="6"/>',
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="m8 12 3 3 5-6"/>',
  pulse: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>',
  document: '<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M15 8V3H3v13h5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>'
};
function icon(name) { const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("aria-hidden", "true"); svg.innerHTML = paths[name] || paths.grid; return svg; }
function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
const categoryIcon = category => ["shield", "pulse", "globe", "target", "code", "document"][CONFIG.categories.indexOf(category)] || "grid";
let prompts = [], loaded = false, selectedId = null, returnFocus = null, returnFocusId = null, toastTimer;
const favouritesKey = favouritesStorageKey(location.href);
const favourites = createFavouritesStore(() => window.localStorage, favouritesKey);
let state = { query: "", category: "", tier: "", effort: "", view: "" };
const dialog = $("#prompt-dialog");
const copyDialog = $("#copy-dialog");

for (const [selector, options] of [["#tier", CONFIG.tiers], ["#effort", CONFIG.effortLevels]]) {
  for (const option of options) { const node = el("option", "", option); node.value = option; $(selector).append(node); }
}
const submissionUrl = formUrl(CONFIG.submissionUrl);
if (submissionUrl) { $("#submit-link").href = submissionUrl; $("#submit-link").hidden = false; $("#submission-pending").hidden = true; }

function readState() {
  const { params } = readLibraryUrl(location.href);
  state = {
    query: params.get("q") || "",
    category: params.get("view") !== "favourites" && CONFIG.categories.includes(params.get("category")) ? params.get("category") : "",
    tier: CONFIG.tiers.includes(params.get("tier")) ? params.get("tier") : "",
    effort: CONFIG.effortLevels.includes(params.get("effort")) ? params.get("effort") : "",
    view: params.get("view") === "favourites" ? "favourites" : ""
  };
  $("#search").value = state.query; $("#tier").value = state.tier; $("#effort").value = state.effort;
}
function saveState() {
  const url = libraryUrl(location.href, { filters: { q: state.query, category: state.category, tier: state.tier, effort: state.effort, view: state.view } });
  history.replaceState(history.state, "", url);
}
function updateState(changes) { Object.assign(state, changes); saveState(); render(); }
function resetFilters() { state = { query: "", category: "", tier: "", effort: "", view: "" }; saveState(); readState(); render(); $("#search").focus(); }
$(".skip-link").addEventListener("click", event => { event.preventDefault(); $("#search").focus(); });
$(".brand").href = libraryUrl(location.href, { filters: {}, promptId: null });
$(".brand").addEventListener("click", event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  history.replaceState({}, "", libraryUrl(location.href, { filters: {}, promptId: null }));
  readState(); render(); syncDetail(); $("#search").focus();
});
$("#search").addEventListener("input", event => updateState({ query: event.target.value }));
$("#tier").addEventListener("change", event => updateState({ tier: event.target.value }));
$("#effort").addEventListener("change", event => updateState({ effort: event.target.value }));
document.addEventListener("keydown", event => {
  if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !document.querySelector("dialog[open]") && !event.target.closest("input,textarea,select,[contenteditable]")) {
    event.preventDefault(); $("#search").focus();
  }
});

function renderCategories() {
  const fragment = document.createDocumentFragment();
  for (const category of ["", "favourites", ...CONFIG.categories]) {
    const isFavourites = category === "favourites";
    const button = el("button", "category-button"); button.type = "button";
    button.setAttribute("aria-pressed", String(isFavourites ? state.view === "favourites" : !state.view && state.category === category));
    const count = filterPrompts(prompts, isFavourites ? { view: "favourites" } : { ...state, category, view: "" }, favourites.ids).length;
    button.append(icon(isFavourites ? "bookmark" : categoryIcon(category)), el("span", "category-name", isFavourites ? "Favourites" : category || "All prompts"), el("span", "category-count", String(count).padStart(2, "0")));
    button.addEventListener("click", () => {
      updateState({ category: isFavourites ? "" : category, view: isFavourites ? "favourites" : "" });
      [...$("#categories").children].find(node => node.dataset.category === category)?.focus();
    });
    button.dataset.category = category;
    fragment.append(button);
  }
  $("#categories").replaceChildren(fragment);
}
function renderChips() {
  const container = $("#active-filters"); container.replaceChildren();
  const labels = { query: "Search", category: "Category", tier: "Copilot", effort: "Effort", view: "Collection" };
  for (const [key, value] of Object.entries(state)) {
    if (!value) continue;
    const displayValue = key === "view" ? "Favourites" : value;
    const chip = el("button", "filter-chip", `${labels[key]}: ${displayValue} ×`);
    chip.setAttribute("aria-label", `Remove ${labels[key].toLowerCase()} filter: ${displayValue}`);
    chip.addEventListener("click", () => { updateState({ [key]: "" }); readState(); $("#search").focus(); });
    container.append(chip);
  }
  container.hidden = !container.children.length;
  if (!container.hidden) { const reset = el("button", "reset-filters", "Clear all"); reset.addEventListener("click", resetFilters); container.append(reset); }
}
function badge(text, premium = false, iconName) {
  const node = el("span", `badge${premium ? " badge-premium" : ""}`);
  if (iconName) node.append(icon(iconName)); node.append(document.createTextNode(text)); return node;
}
function copyButton(prompt, primary = false) {
  const button = el("button", primary ? "button button-brass" : "copy-button");
  button.append(icon("copy"), document.createTextNode("Copy prompt"));
  button.setAttribute("aria-label", `Copy prompt: ${prompt.title}`);
  button.addEventListener("click", () => copyPrompt(prompt.prompt, button)); return button;
}
function ratingAction(prompt, full = false) {
  const href = ratingFormUrl(prompt);
  const action = el(href ? "a" : "button", full ? "button button-outline rating-action" : "rating-action");
  action.append(icon("star"), document.createTextNode(full ? "Rate this prompt" : href ? "Rate" : "Rate · soon"));
  if (href) {
    action.href = href; action.target = "_blank"; action.rel = "noopener noreferrer";
    action.setAttribute("aria-label", `Rate prompt: ${prompt.title} (opens Microsoft Forms in a new tab)`);
    action.title = "Rate this prompt in Microsoft Forms (opens in a new tab)";
  } else {
    action.type = "button"; action.disabled = true;
    action.setAttribute("aria-label", `Rate prompt: ${prompt.title} — ratings are not available yet`);
    action.title = "Ratings are not available yet";
  }
  return action;
}
function favouriteButton(prompt, full = false) {
  const button = el("button", `favourite-button${full ? " favourite-button-full" : ""}`);
  button.type = "button"; button.dataset.favouriteId = prompt.id;
  button.setAttribute("aria-label", `Favourite: ${prompt.title}`);
  button.setAttribute("aria-pressed", String(favourites.has(prompt.id)));
  button.title = favourites.has(prompt.id) ? "Remove from favourites" : "Add to favourites";
  button.append(icon("bookmark"));
  if (full) button.append(document.createTextNode("Favourite"));
  button.addEventListener("click", () => {
    const result = favourites.toggle(prompt.id);
    refreshFavouriteUI();
    showToast(result.persistent ? (result.saved ? "Added to favourites." : "Removed from favourites.")
      : "Favourites updated for this visit. Browser storage is unavailable, so changes won’t survive a reload.");
  });
  return button;
}
function refreshFavouriteUI() {
  const focused = document.activeElement;
  const cardButtons = [...document.querySelectorAll("#results .favourite-button")];
  const index = cardButtons.indexOf(focused);
  if (state.view === "favourites") render(); else renderCategories();
  for (const button of document.querySelectorAll(".favourite-button")) {
    const saved = favourites.has(button.dataset.favouriteId);
    button.setAttribute("aria-pressed", String(saved));
    button.title = saved ? "Remove from favourites" : "Add to favourites";
  }
  if (focused?.isConnected) return;
  const nextButtons = [...document.querySelectorAll("#results .favourite-button")];
  const replacement = nextButtons.find(button => button.dataset.favouriteId === focused?.dataset.favouriteId)
    || (index >= 0 ? nextButtons[Math.min(index, nextButtons.length - 1)] : null)
    || [...$("#categories").children].find(button => button.dataset.category === (focused?.dataset.category ?? "favourites"));
  replacement?.focus({ preventScroll: true });
}
window.addEventListener("storage", event => {
  if (event.key !== favouritesKey && event.key !== null) return;
  try { if (event.storageArea !== window.localStorage) return; } catch { return; }
  favourites.sync(event.newValue); refreshFavouriteUI();
});
function card(prompt) {
  const article = el("article", "prompt-card");
  const top = el("div", "card-top"), category = el("span", "card-category");
  category.append(icon(categoryIcon(prompt.category)), document.createTextNode(prompt.category));
  top.append(category, favouriteButton(prompt));
  const title = el("h3", "card-title"), link = el("a", "", prompt.title);
  link.href = libraryUrl(location.href, { promptId: prompt.id });
  link.addEventListener("click", event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); returnFocus = link; returnFocusId = prompt.id;
    history.pushState({ promptEntry: true }, "", link.href); syncDetail();
  });
  title.append(link);
  const badges = el("div", "badge-row");
  badges.append(badge(`Copilot ${prompt.copilotRequirement}`, prompt.copilotRequirement === "Premium", "spark"), badge(effortLabel(prompt)));
  if (prompt.copilotRequirement === "Premium" && prompt.workIqRequired) badges.append(badge("Work IQ required", true));
  const footer = el("div", "card-footer"), author = el("span", "card-author");
  author.append(icon("user"), document.createTextNode(prompt.author));
  const actions = el("div", "card-actions");
  actions.append(ratingAction(prompt), copyButton(prompt));
  footer.append(author, actions);
  article.append(top, title, el("p", "card-description", prompt.description), badges, footer);
  return article;
}
function stateBox(title, message, action, label, iconName = "search") {
  const box = el("div", "state-box"); box.append(icon(iconName), el("h3", "", title), el("p", "", message));
  if (action) { const button = el("button", "button button-outline", label); button.addEventListener("click", action); box.append(button); }
  return box;
}
function render() {
  renderCategories(); renderChips();
  if (!loaded) return;
  const visible = filterPrompts(prompts, state, favourites.ids);
  const isFavourites = state.view === "favourites";
  const savedCount = filterPrompts(prompts, { view: "favourites" }, favourites.ids).length;
  $("#results-title").textContent = isFavourites ? "Favourites" : state.category || (state.query ? "Search results" : "All prompts");
  $("#result-count").textContent = isFavourites ? `${visible.length} of ${savedCount} favourites` : `${visible.length} of ${prompts.length} prompts`;
  $("#favourites-note").hidden = !isFavourites;
  $("#favourites-note").textContent = favourites.persistent
    ? "Saved in this browser. Favourites don’t sync across devices."
    : "Browser storage is unavailable. Favourites are kept only for this visit.";
  const fragment = document.createDocumentFragment();
  if (!prompts.length) fragment.append(stateBox("A collection in the making", "Approved prompts will appear here. Check back soon for your first starting point."));
  else if (isFavourites && !savedCount) fragment.append(stateBox("Your favourites start here", "Select the bookmark on any prompt to keep it close at hand.", resetFilters, "Explore all prompts", "bookmark"));
  else if (isFavourites && !visible.length) fragment.append(stateBox("No matching favourites", "Try a broader keyword or clear your filters to see your saved prompts.", () => {
    updateState({ query: "", category: "", tier: "", effort: "" }); readState(); $("#search").focus();
  }, "Clear search & filters", "bookmark"));
  else if (!visible.length) fragment.append(stateBox("No prompts found", "Try a broader keyword or clear your filters to explore the full collection.", resetFilters, "Clear search & filters"));
  else visible.forEach(prompt => fragment.append(card(prompt)));
  $("#results").replaceChildren(fragment);
}
function showToast(message) {
  clearTimeout(toastTimer); $("#toast").textContent = message; $("#toast").hidden = false;
  const feedback = $("#detail-feedback"); if (feedback) feedback.textContent = message;
  toastTimer = setTimeout(() => { $("#toast").hidden = true; if (feedback) feedback.textContent = ""; }, 2800);
}
async function copyPrompt(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    if (button?.isConnected) {
      button.replaceChildren(icon("check"), document.createTextNode("Copied")); button.classList.add("copied");
      setTimeout(() => { if (button.isConnected) { button.replaceChildren(icon("copy"), document.createTextNode("Copy prompt")); button.classList.remove("copied"); } }, 2000);
    }
    showToast("Prompt copied. Ready for your AI.");
  } catch {
    $("#manual-copy").value = text;
    if (!copyDialog.open) copyDialog.showModal();
    $("#manual-copy").focus(); $("#manual-copy").select();
  }
}
$("#close-copy").addEventListener("click", () => copyDialog.close());
$("#select-copy").addEventListener("click", () => { $("#manual-copy").focus(); $("#manual-copy").select(); });

function detail(prompt) {
  const content = $("#detail-content"); content.replaceChildren();
  const header = el("div", "detail-header"), category = el("span", "card-category");
  category.append(icon(categoryIcon(prompt.category)), document.createTextNode(prompt.category));
  const title = el("h2", "", prompt.title); title.id = "detail-title";
  const top = el("div", "detail-title-row"); top.append(category, favouriteButton(prompt, true));
  header.append(top, title, el("p", "", prompt.description)); content.append(header);
  const meta = el("dl", "detail-meta");
  for (const [label, value] of [["Copilot requirement", prompt.copilotRequirement], ["Effort level", effortLabel(prompt)], ["Work IQ", workIqLabel(prompt)], ["Author", prompt.author]]) {
    const pair = el("div"); pair.append(el("dt", "", label), el("dd", "", value)); meta.append(pair);
  }
  content.append(meta);
  const section = el("section", "detail-section"), heading = el("div", "detail-section-heading");
  heading.append(el("h3", "", "The prompt"), copyButton(prompt, true));
  const pre = el("pre", "prompt-text", prompt.prompt); pre.tabIndex = 0; pre.setAttribute("aria-label", "Full prompt text");
  const feedback = el("p", "", ""); feedback.id = "detail-feedback"; feedback.setAttribute("role", "status"); feedback.style.color = "var(--sage)";
  section.append(heading, pre, feedback); content.append(section);
  const rating = el("section", "detail-rating");
  const ratingCopy = el("div");
  ratingCopy.append(el("h3", "", "Was this prompt useful?"), el("p", "", ratingFormUrl(prompt)
    ? "Share a 1–5 rating and an optional comment in Microsoft Forms."
    : "Ratings are not available yet. Please check back soon."));
  rating.append(ratingCopy, ratingAction(prompt, true)); content.append(rating);
  const benefit = el("section", "detail-section"); benefit.append(el("h3", "", "Impact & benefits"), el("p", "", prompt.impactBenefits)); content.append(benefit);
  if (prompt.sources.length) {
    const sources = el("section", "detail-section"), list = el("ul", "source-list");
    sources.append(el("h3", "", "Sources & inspiration"));
    for (const source of prompt.sources) {
      const item = el("li"), link = el("a", "", `${source.title} ↗`); link.href = safeHttpsUrl(source.url); link.target = "_blank"; link.rel = "noopener noreferrer";
      item.append(link, el("small", "", source.author)); list.append(item);
    }
    sources.append(list); content.append(sources);
  }
  content.append(el("p", "validation-note", prompt.validationStatus === "Awaiting internal validation" ? "Adapted starter template · Awaiting internal validation. Supply the bracketed inputs and review the result in your own environment." : "Internally validated template. Review results for your current task and context."));
  const local = location.protocol === "file:";
  const bottom = el("div", "detail-bottom"), share = el("button", "button button-outline", local ? "Copy local link ↗" : "Copy link ↗");
  if (local) share.title = "This link points to the HTML file on this device. Share the HTML file itself with other people.";
  share.addEventListener("click", async () => {
    const url = libraryUrl(location.href, { filters: {} });
    try { await navigator.clipboard.writeText(url.href); showToast(local ? "Local prompt link copied. Works on this device." : "Prompt link copied."); }
    catch { $("#manual-copy").value = url.href; if (!copyDialog.open) copyDialog.showModal(); $("#manual-copy").focus(); $("#manual-copy").select(); }
  });
  bottom.append(el("small", "", `Reference: ${prompt.id}`), share); content.append(bottom);
}
function requestedId() { return readLibraryUrl(location.href).promptId; }
function syncDetail() {
  if (!loaded) return;
  const id = requestedId();
  if (!id) {
    selectedId = null;
    if (dialog.open) {
      dialog.close();
      const restored = returnFocus?.isConnected ? returnFocus : [...document.querySelectorAll(".card-title a")].find(link => readLibraryUrl(link.href).promptId === returnFocusId);
      (restored || $("#search")).focus();
    }
    return;
  }
  if (id === selectedId && dialog.open) return;
  selectedId = id;
  const prompt = prompts.find(p => p.id === id);
  if (prompt) detail(prompt);
  else { const box = stateBox("Prompt not found", "This prompt may have moved or been removed. Close this panel to browse the collection."); box.querySelector("h3").id = "detail-title"; $("#detail-content").replaceChildren(box); }
  if (!dialog.open) dialog.showModal(); dialog.scrollTop = 0; $("#close-detail").focus();
}
function closeDetail() {
  if (history.state?.promptEntry) history.back();
  else { history.replaceState({}, "", libraryUrl(location.href, { promptId: null })); syncDetail(); }
}
$("#close-detail").addEventListener("click", closeDetail);
dialog.addEventListener("cancel", event => { event.preventDefault(); closeDetail(); });
dialog.addEventListener("click", event => { if (event.target === dialog && event.clientX < dialog.getBoundingClientRect().left) closeDetail(); });
function navigate() {
  const previous = JSON.stringify(state);
  readState();
  if (JSON.stringify(state) !== previous) render();
  syncDetail();
}
window.addEventListener("popstate", navigate);
window.addEventListener("hashchange", navigate);

function load() {
  loaded = false; $("#results").setAttribute("aria-busy", "true"); $("#result-count").textContent = "Loading collection…";
  $("#results").replaceChildren(stateBox("Opening the collection", "Your next starting point is on its way."));
  try {
    const data = JSON.parse($("#catalogue-data").textContent), errors = validateCatalogue(data);
    if (errors.length) throw new Error(errors.join("\n"));
    prompts = data; loaded = true;
    $("#total-prompts").textContent = String(prompts.length).padStart(2, "0");
    $("#total-categories").textContent = String(new Set(prompts.map(p => p.category)).size).padStart(2, "0");
    render(); syncDetail();
  } catch (error) {
    console.error("Prompt library:", error);
    $("#result-count").textContent = "Collection unavailable";
    $("#results").replaceChildren(stateBox("The collection couldn’t load", "Please try again. If this continues, contact the catalogue maintainer.", load, "Try again"));
  } finally { $("#results").setAttribute("aria-busy", "false"); }
}
readState(); renderCategories(); load();
