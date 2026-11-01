import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import { renderStandalone, inlineJson } from "../scripts/build-standalone.mjs";
import { readLibraryUrl, libraryUrl, favouritesStorageKey } from "../core.js";

test("standalone HTML includes the complete catalogue, styling, executable code and notices without external assets", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html, await renderStandalone());
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 3);
  const data = JSON.parse(scripts.find(([tag]) => tag.includes('id="catalogue-data"'))[2]);
  assert.deepEqual(data, JSON.parse(await readFile(new URL("../prompts.json", import.meta.url), "utf8")));
  assert.match(JSON.parse(scripts.find(([tag]) => tag.includes('id="third-party-notices"'))[2]), /Copyright \(c\) 2025 apologetik/);
  const code = scripts.find(([, attributes]) => !attributes.trim())[2];
  assert.doesNotThrow(() => new Script(code));
  assert.doesNotMatch(code, /\bfetch\s*\(|import\.meta|^import /m);
  assert.doesNotMatch(html, /<script[^>]*\bsrc=|<link[^>]*rel="stylesheet"|<link[^>]*href="\.\//);
  assert.ok(html.includes(await readFile(new URL("../styles.css", import.meta.url), "utf8")));
});

test("embedded prompt text cannot break out of its data block", () => {
  const value = { title: '<!-- <script> </script><img src=x onerror=alert(1)>', prompt: 'A&B \\"quotes\\"\nline\u2028separator' };
  const json = inlineJson(value);
  assert.ok(!json.includes("<"));
  assert.deepEqual(JSON.parse(json), value);
});

for (const base of ["file:///tmp/My%20Library.html", "https://example.com/ai-prompt-catalogue/"]) {
  test(`search, favourites, details and cleared links round-trip on ${new URL(base).protocol}`, () => {
    const filtered = libraryUrl(base, { filters: { q: "A&B café #?", category: "Security operations", view: "favourites" } });
    if (filtered.protocol === "file:") assert.equal(filtered.search, "");
    const detail = libraryUrl(filtered, { promptId: "email-triage" });
    assert.equal(readLibraryUrl(detail).promptId, "email-triage");
    assert.equal(readLibraryUrl(detail).params.get("q"), "A&B café #?");
    assert.equal(readLibraryUrl(detail).params.get("view"), "favourites");
    const closed = libraryUrl(detail, { promptId: null });
    assert.equal(readLibraryUrl(closed).promptId, null);
    assert.equal(readLibraryUrl(closed).params.get("q"), "A&B café #?");
    const share = libraryUrl(detail, { filters: {} });
    assert.equal(readLibraryUrl(share).params.size, 0);
    assert.equal(readLibraryUrl(share).promptId, "email-triage");
    const home = libraryUrl(detail, { filters: {}, promptId: null });
    assert.equal(readLibraryUrl(home).params.size, 0);
    assert.equal(readLibraryUrl(home).promptId, null);
  });
}
test("existing hosted links and saved favourites remain compatible; separate local files get separate keys", () => {
  assert.equal(libraryUrl("https://example.com/library/?q=alert", { promptId: "email-triage" }).href, "https://example.com/library/?q=alert#prompt/email-triage");
  assert.equal(favouritesStorageKey("https://example.com/library/index.html"), "cyber-prompt-library:favourites:v1:/library/");
  assert.notEqual(favouritesStorageKey("file:///tmp/one.html"), favouritesStorageKey("file:///tmp/two.html"));
  assert.equal(favouritesStorageKey("file:///tmp/one.html#?q=alert"), favouritesStorageKey("file:///tmp/one.html"));
  assert.equal(readLibraryUrl("file:///tmp/index.html#prompt/%ZZ").promptId, "invalid-link");
  assert.equal(readLibraryUrl("file:///tmp/index.html?q=old#?").params.size, 0);
});
