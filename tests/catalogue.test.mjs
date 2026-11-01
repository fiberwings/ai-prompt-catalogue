import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { CONFIG } from "../config.js";
import { validateCatalogue, filterPrompts, effortLabel, workIqLabel, safeHttpsUrl, formUrl, ratingFormUrl } from "../core.js";

const prompts = JSON.parse(await readFile(new URL("../prompts.json", import.meta.url), "utf8"));
const base = () => structuredClone(prompts[0]);
test("starter collection is complete, attributed and valid", () => {
  assert.equal(prompts.length, 12); assert.deepEqual(validateCatalogue(prompts), []);
  for (const category of CONFIG.categories) assert.equal(prompts.filter(p => p.category === category).length, 2);
  for (const p of prompts) { assert.equal(p.copilotRequirement, "Basic"); assert.equal(p.effortLevel, "Auto"); assert.ok(p.sources.length); assert.equal(p.validationStatus, "Awaiting internal validation"); }
});
test("search finds content exclusively in every published field", () => {
  for (const key of ["title", "description", "prompt", "impactBenefits", "author", "category", "copilotRequirement", "effortLevel", "validationStatus", "id", "otherEffortLevel"]) {
    const p = base(); p[key] = "DistinctiveNeedle";
    assert.equal(filterPrompts([p], { query: "distinctiveneedle" }).length, 1, key);
  }
  for (const key of ["title", "author", "url"]) { const p = base(); p.sources = [{ title: "", author: "", url: "", [key]: "SourceNeedle" }]; assert.equal(filterPrompts([p], { query: "sourceneedle" }).length, 1, `source ${key}`); }
});
test("search spans fields, normalises accents and ranks title matches", () => {
  const a = base(), b = base(); a.title = "Café analysis"; a.author = "Alex Morgan";
  assert.equal(filterPrompts([a], { query: "CAFÉ  morgan" }).length, 1);
  assert.equal(filterPrompts([a], { query: "cafe morgan" }).length, 1);
  a.description = "Zephyr"; b.title = "Zephyr"; b.id = "zephyr";
  assert.equal(filterPrompts([a, b], { query: "zephyr" })[0].id, "zephyr");
  assert.equal(filterPrompts([a], { query: "cafe nonexistentneedle" }).length, 0);
});
test("all filters combine and clearing them restores all records", () => {
  const premium = base(); premium.id = "premium"; premium.copilotRequirement = "Premium"; premium.workIqRequired = true; premium.effortLevel = "Other"; premium.otherEffortLevel = "Custom thought";
  const data = [...prompts, premium];
  assert.equal(filterPrompts(data, { category: premium.category, tier: "Premium", effort: "Other", query: "custom thought" }).length, 1);
  assert.equal(filterPrompts(data, { tier: "Basic", effort: "Other" }).length, 0);
  assert.equal(filterPrompts(data, {}).length, 13);
  assert.equal(filterPrompts([premium], { query: "work iq required" }).length, 1);
  assert.equal(effortLabel(premium), "Other · Custom thought"); assert.equal(workIqLabel(premium), "Required");
});
test("invalid records and private fields cannot enter a published catalogue", () => {
  const mutations = [p => {p.title = " ";}, p => {p.workIqRequired = true;}, p => {p.copilotRequirement = "Premium";}, p => {p.effortLevel = "Other";}, p => {p.otherEffortLevel = "Stale value";}, p => {p.category = "Unknown";}, p => {p.effortLevel = "Unknown";}, p => {p.prompt = "a".repeat(4001);}, p => {p.email = "private@example.com";}, p => {p.sources[0].url = "javascript:alert(1)";}, p => {p.sources[0].email = "private@example.com";}];
  for (const mutate of mutations) { const p = base(); mutate(p); assert.ok(validateCatalogue([p]).length); }
  assert.ok(validateCatalogue([base(), base()]).some(e => e.includes("Duplicate")));
  assert.ok(validateCatalogue({}).length); assert.deepEqual(validateCatalogue([]), []);
});
test("Premium supports explicit yes/no and Other requires separate text", () => {
  const p = base(); p.copilotRequirement = "Premium"; p.effortLevel = "Other"; p.otherEffortLevel = "Analyst mode";
  for (const value of [true, false]) { p.workIqRequired = value; assert.deepEqual(validateCatalogue([p]), []); }
  p.workIqRequired = "No"; assert.ok(validateCatalogue([p]).length);
});
test("links reject unsafe protocols, credentials and lookalike form hosts", () => {
  assert.equal(safeHttpsUrl("javascript:alert(1)"), null); assert.equal(safeHttpsUrl("https://me:secret@example.com"), null);
  assert.equal(formUrl("https://forms.office.com.evil.example/form"), null);
  assert.equal(formUrl(""), null); assert.equal(formUrl("https://forms.office.com/r/abc"), "https://forms.office.com/r/abc");
});
test("the semantic colour pairs meet WCAG AA text contrast", () => {
  const luminance = hex => { const values = hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722; };
  for (const [fg, bg] of [["F2F0E9","14181C"],["B3BABF","1E2429"],["C8AA72","1E2429"],["14181C","C8AA72"],["91B29B","1E2429"]]) {
    const a = luminance(fg), b = luminance(bg); assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5, `${fg} on ${bg}`);
  }
});

const ratingTemplate = "https://forms.office.com/Pages/ResponsePage.aspx?id=tenant-form&origin=lprLink&rReference=CPL_PROMPT_ID&rTitle=CPL_PROMPT_TITLE";
test("rating links identify the exact prompt and preserve the Forms-generated fields", () => {
  const p = { ...base(), title: 'Review A&B + café / "logs"? #1 <tag> %20' };
  const url = new URL(ratingFormUrl(p, ratingTemplate));
  assert.equal(url.hostname, "forms.office.com");
  assert.equal(url.searchParams.get("id"), "tenant-form");
  assert.equal(url.searchParams.get("origin"), "lprLink");
  assert.equal(url.searchParams.get("rReference"), p.id);
  assert.equal(url.searchParams.get("rTitle"), p.title);
  assert.equal(url.searchParams.size, 4);
  assert.equal(url.hash, "");
  assert.ok(!url.href.includes(encodeURIComponent(p.prompt)));
  const second = base(); second.id = "another-prompt";
  assert.notEqual(ratingFormUrl(p, ratingTemplate), ratingFormUrl(second, ratingTemplate));
  assert.equal(new URL(ratingFormUrl({id:"test",title:"CPL_PROMPT_ID"}, ratingTemplate)).searchParams.get("rTitle"), "CPL_PROMPT_ID");
});
test("rating setup fails closed for absent, unsafe or ambiguous prefilled links", () => {
  for (const template of ["", "javascript:alert(1)", ratingTemplate.replace("forms.office.com", "forms.office.com.evil.example"),
    ratingTemplate.replace("https:", "http:"), ratingTemplate.replace("tenant-form", ""),
    "https://forms.office.com/r/short", ratingTemplate.replace("ResponsePage.aspx", "DesignPageV2.aspx"),
    ratingTemplate.replace("CPL_PROMPT_TITLE", ""), ratingTemplate.replace("CPL_PROMPT_ID", "prefix-CPL_PROMPT_ID"),
    ratingTemplate + "&rExtra=CPL_PROMPT_ID", ratingTemplate + "&rReference=unrelated",
    ratingTemplate.replace("id=tenant-form&r", "id=CPL_PROMPT_ID&r").replace("rReference=CPL_PROMPT_ID", "rReference=wrong")]) {
    assert.equal(ratingFormUrl(base(), template), null, template);
  }
  assert.equal(ratingFormUrl({id:"", title:"Test"}, ratingTemplate), null);
  assert.equal(ratingFormUrl(null, ratingTemplate), null);
  for (const host of ["forms.office.com", "forms.cloud.microsoft", "forms.microsoft.com"]) {
    assert.ok(ratingFormUrl(base(), ratingTemplate.replace("forms.office.com",host)));
  }
});
