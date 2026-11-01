import { CONFIG } from "./config.js";

// File URLs keep navigation in the fragment: browsers restrict history changes
// to the query string of a local file. Hosted URLs retain their existing format.
export function readLibraryUrl(value) {
  const url = new URL(value);
  const [route, ...query] = url.hash.slice(1).split("?");
  const params = url.protocol === "file:" && query.length
    ? new URLSearchParams(query.join("?")) : url.searchParams;
  let promptId = null;
  if (route.startsWith("prompt/")) {
    try { promptId = decodeURIComponent(route.slice(7)); }
    catch { promptId = "invalid-link"; }
  }
  return { params, promptId };
}
export function libraryUrl(value, changes = {}) {
  const url = new URL(value), current = readLibraryUrl(value);
  const params = new URLSearchParams(current.params);
  if (changes.filters) {
    for (const key of ["q", "category", "tier", "effort", "view"]) {
      if (changes.filters[key]) params.set(key, changes.filters[key]); else params.delete(key);
    }
  }
  const promptId = "promptId" in changes ? changes.promptId : current.promptId;
  const route = promptId ? `prompt/${encodeURIComponent(promptId)}` : "";
  if (url.protocol === "file:") url.hash = `${route}?${params}`;
  else { url.search = params.toString(); url.hash = route; }
  return url;
}
export function favouritesStorageKey(value) {
  const url = new URL(value);
  const path = url.protocol === "file:" ? url.pathname : new URL("./", url).pathname;
  return `cyber-prompt-library:favourites:v1:${path}`;
}

export const normalise = value => String(value ?? "").normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
export const effortLabel = prompt => prompt.effortLevel === "Other" ? `Other · ${prompt.otherEffortLevel}` : prompt.effortLevel;
export const workIqLabel = prompt => prompt.copilotRequirement === "Basic" ? "Not applicable" : prompt.workIqRequired ? "Required" : "Not required";
export function searchableText(prompt) {
  const flatten = value => value && typeof value === "object" ? Object.values(value).map(flatten).join(" ") : String(value ?? "");
  return normalise(`${flatten(prompt)} Copilot ${prompt.copilotRequirement} Work IQ ${workIqLabel(prompt)} ${prompt.workIqRequired === null ? "" : prompt.workIqRequired ? "yes" : "no"}`);
}
export function filterPrompts(prompts, state = {}, favouriteIds = new Set()) {
  const terms = normalise(state.query).split(" ").filter(Boolean);
  return prompts.filter(p => (state.view !== "favourites" || favouriteIds.has(p.id))
    && (!state.category || p.category === state.category)
    && (!state.tier || p.copilotRequirement === state.tier)
    && (!state.effort || p.effortLevel === state.effort)
    && terms.every(term => searchableText(p).includes(term)))
    .map(prompt => ({ prompt, score: terms.reduce((score, term) => score
      + (normalise(prompt.title).includes(term) ? 10 : 0)
      + (normalise(prompt.description).includes(term) ? 3 : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.prompt.title.localeCompare(b.prompt.title))
    .map(({ prompt }) => prompt);
}
const validFavouriteId = id => typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
function parseFavourites(raw) {
  try {
    const data = JSON.parse(raw);
    return new Set(Array.isArray(data) ? data.filter(validFavouriteId) : []);
  } catch { return new Set(); }
}
export function createFavouritesStore(getStorage, key) {
  let ids = new Set(), persistent = true;
  try { ids = parseFavourites(getStorage().getItem(key)); }
  catch { persistent = false; }
  return {
    get ids() { return new Set(ids); },
    get persistent() { return persistent; },
    has(id) { return ids.has(id); },
    toggle(id) {
      if (!validFavouriteId(id)) throw new TypeError("Invalid favourite ID.");
      // Start with the latest saved list so another tab's recent changes survive.
      if (persistent) {
        try { ids = parseFavourites(getStorage().getItem(key)); }
        catch { persistent = false; }
      }
      const saved = !ids.has(id);
      if (saved) ids.add(id); else ids.delete(id);
      try { getStorage().setItem(key, JSON.stringify([...ids])); persistent = true; }
      catch { persistent = false; }
      return { saved, persistent };
    },
    sync(raw) { ids = parseFavourites(raw); persistent = true; }
  };
}
export function safeHttpsUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
export function formUrl(value) {
  const url = safeHttpsUrl(value);
  if (!url) return null;
  return ["forms.office.com", "forms.cloud.microsoft", "forms.microsoft.com"].includes(new URL(url).hostname) ? url : null;
}
// Substitute only the two designated answer values in a Forms-generated URL.
// Never send the prompt text or a preselected score to the rating form.
export function ratingFormUrl(prompt, template = CONFIG.ratingFormUrl) {
  const safe = formUrl(template);
  if (!safe || !prompt || typeof prompt.id !== "string" || !prompt.id.trim()
    || typeof prompt.title !== "string" || !prompt.title.trim()) return null;
  const url = new URL(safe);
  if (!/\/ResponsePage\.aspx$/i.test(url.pathname) || !url.searchParams.get("id")) return null;
  const entries = [...url.searchParams];
  const replacements = new Map([["CPL_PROMPT_ID", prompt.id], ["CPL_PROMPT_TITLE", prompt.title]]);
  for (const marker of replacements.keys()) {
    const answers = entries.filter(([, value]) => value === marker);
    if (answers.length !== 1 || answers[0][0].toLowerCase() === "id"
      || url.searchParams.getAll(answers[0][0]).length !== 1) return null;
  }
  url.search = new URLSearchParams(entries.map(([key, value]) => [key, replacements.get(value) ?? value])).toString();
  return url.href;
}
export function validateCatalogue(data) {
  const errors = [];
  if (!Array.isArray(data)) return ["The catalogue must be an array of prompts."];
  const fields = new Set(["id", "title", "category", "description", "prompt", "impactBenefits", "author", "copilotRequirement", "workIqRequired", "effortLevel", "otherEffortLevel", "sources", "validationStatus"]);
  const ids = new Set();
  for (const [index, p] of data.entries()) {
    const at = `Entry ${index + 1}`;
    if (!p || typeof p !== "object" || Array.isArray(p)) { errors.push(`${at}: expected an object.`); continue; }
    const fail = message => errors.push(`${at} (${p.id || "no ID"}): ${message}`);
    for (const key of Object.keys(p)) if (!fields.has(key)) fail(`Unexpected field "${key}". Keep private submission data out of the catalogue.`);
    for (const key of ["id", "title", "category", "description", "prompt", "impactBenefits", "author", "copilotRequirement", "effortLevel", "validationStatus"]) {
      if (typeof p[key] !== "string" || !p[key].trim()) fail(`${key} must be nonempty text.`);
    }
    if (typeof p.id === "string" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id)) fail("ID must be a lowercase, hyphen-separated slug.");
    if (ids.has(p.id)) fail("Duplicate ID.");
    ids.add(p.id);
    if (!CONFIG.categories.includes(p.category)) fail("Unknown category.");
    if (!CONFIG.tiers.includes(p.copilotRequirement)) fail("Unknown Copilot requirement.");
    if (!CONFIG.effortLevels.includes(p.effortLevel)) fail("Unknown effort level.");
    if (p.copilotRequirement === "Premium" && typeof p.workIqRequired !== "boolean") fail("Premium requires an explicit Work IQ boolean.");
    if (p.copilotRequirement === "Basic" && p.workIqRequired !== null) fail("Basic must use null for Work IQ.");
    if (p.effortLevel === "Other" && (typeof p.otherEffortLevel !== "string" || !p.otherEffortLevel.trim())) fail("Other effort requires a description.");
    if (p.effortLevel !== "Other" && p.otherEffortLevel !== null) fail("Clear otherEffortLevel to null unless Other is selected.");
    if (typeof p.prompt === "string" && p.prompt.length > 4000) fail("Prompt exceeds the Microsoft Forms 4,000-character answer limit.");
    if (!["Awaiting internal validation", "Internally validated"].includes(p.validationStatus)) fail("Unknown validation status.");
    if (!Array.isArray(p.sources)) fail("Sources must be an array (empty is allowed).");
    else for (const source of p.sources) {
      if (!source || typeof source !== "object" || Array.isArray(source)) { fail("Invalid source."); continue; }
      for (const key of Object.keys(source)) if (!["title", "author", "url"].includes(key)) fail(`Unexpected source field "${key}".`);
      if (typeof source.title !== "string" || !source.title.trim() || typeof source.author !== "string" || !source.author.trim() || !safeHttpsUrl(source.url)) fail("Sources require a title, author and valid HTTPS URL.");
    }
  }
  return errors;
}
