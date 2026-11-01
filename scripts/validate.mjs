import { readFile } from "node:fs/promises";
import { validateCatalogue, formUrl, ratingFormUrl } from "../core.js";
import { CONFIG } from "../config.js";

try {
  const data = JSON.parse(await readFile(new URL("../prompts.json", import.meta.url), "utf8"));
  const errors = validateCatalogue(data);
  if (CONFIG.submissionUrl && !formUrl(CONFIG.submissionUrl)) errors.push("Configure a valid HTTPS Microsoft Forms response URL.");
  if (CONFIG.ratingFormUrl && !ratingFormUrl({ id: "validation-check", title: "Validation check" })) errors.push("Configure a Forms-generated prefilled rating response URL with separate CPL_PROMPT_ID and CPL_PROMPT_TITLE answer values.");
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else { console.log(`Validated ${data.length} prompts across ${new Set(data.map(p => p.category)).size} categories.`); console.log(CONFIG.submissionUrl ? "Microsoft Forms link configured." : "Microsoft Forms setup pending; submissions are visibly unavailable."); console.log(CONFIG.ratingFormUrl ? "Rating form link configured; verify the live tenant form before launch." : "Rating form setup pending; rating actions are visibly unavailable."); }
} catch (error) { console.error(error.message); process.exitCode = 1; }
