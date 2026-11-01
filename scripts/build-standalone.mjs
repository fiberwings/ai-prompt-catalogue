import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
// Escape all markup delimiters, including </script> and <!--, in embedded JSON.
export const inlineJson = value => JSON.stringify(value, null, 2).replace(/</g, "\\u003c");
const classicScript = source => source
  .replace(/^import .+ from .+;\r?\n/gm, "")
  .replace(/^export (?=(?:const|function)\b)/gm, "");

export async function renderStandalone() {
  const names = ["src/index.template.html", "styles.css", "favicon.svg", "prompts.json", "THIRD_PARTY_NOTICES.txt", "config.js", "core.js", "app.js"];
  const [template, styles, favicon, catalogue, notices, ...scripts] = await Promise.all(names.map(name => readFile(new URL(name, root), "utf8")));
  const app = `(() => {\n"use strict";\n${scripts.map(classicScript).join("\n")}\n})();`;
  if (/<\/script/i.test(app) || /<\/style/i.test(styles)) throw new Error("Unexpected closing tag in source code.");
  const replacements = {
    FAVICON: `data:image/svg+xml,${encodeURIComponent(favicon)}`,
    STYLES: styles, CATALOGUE: inlineJson(JSON.parse(catalogue)), NOTICES: inlineJson(notices), APP: app
  };
  return template.replace(/\{\{(FAVICON|STYLES|CATALOGUE|NOTICES|APP)\}\}/g, (_, key) => replacements[key]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const html = await renderStandalone();
  const target = new URL("index.html", root);
  if (process.argv.includes("--check")) {
    if (await readFile(target, "utf8") !== html) throw new Error("index.html is out of date. Run npm run build and commit it with the sources.");
    console.log("Standalone index.html matches its sources.");
  } else {
    await writeFile(target, html);
    console.log("Wrote standalone index.html. Open it directly in a browser; no server is needed.");
  }
}
