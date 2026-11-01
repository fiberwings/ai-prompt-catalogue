# Cyber Prompt Library

A static, searchable cybersecurity prompt catalogue. Charcoal, ivory and muted brass; no framework, database, telemetry, external font requests or AI API calls. Twelve researched starter templates are included. All are marked as awaiting internal validation.

## Open the app

Download `index.html` and double-click it to open it in a current browser. That single file contains the interface, styles, code, all 12 prompts and third-party notices. No Node.js, installation, server, build command or internet connection is needed to browse, search, filter or copy prompts. You can rename the file or copy it to another computer without its source files.

On GitHub, open `index.html` and use **Download raw file**; saving the GitHub page itself saves GitHub’s viewer instead of the app. Keep JavaScript enabled. If the browser blocks automatic clipboard access, use the provided select-and-copy dialog. Source links and configured Microsoft Forms actions require an internet connection.

Local prompt links refer to the file on your own device. To share the library with someone else, send them the HTML file. The same `index.html` also works on static hosting.

## Optional maintainer tools

Node.js 20 or later is used only to regenerate the HTML after source edits and run development checks. The ready-to-open `index.html` is checked into the repository; app users never need these tools. No dependency installation is needed.

```sh
npm run build
npm run validate
npm test
```

Edit `src/index.template.html`, `styles.css`, `app.js`, `core.js`, `config.js` or `prompts.json`, then regenerate and commit `index.html` alongside the edited sources. Validation and CI reject a stale generated file. Third-party notices are embedded automatically. Direct edits to generated `index.html` are overwritten by the next build.

For optional HTTP preview, run `npm start` and open http://127.0.0.1:4173 (or http://127.0.0.1:4173/ai-prompt-catalogue/ to exercise a project path). This preview server is not needed to use the app.

## Using the library

Search covers every published field, including source attribution and full prompt text. Words may match in different fields; every word must match. Title matches rank above description matches. Results otherwise sort alphabetically. Select a category, Copilot plan or effort level to narrow results. Press `/` to focus search.

Every card has a copy button and a rating action. Open its title for the full prompt, benefits, requirements and sources. Copying preserves the prompt exactly; substitute bracketed inputs in Copilot. The details panel has a shareable link. Escape or browser Back closes the panel. If clipboard writing is unavailable, a dialog presents selectable text.

## Favourites

Select the bookmark in a card's top corner or **Favourite** in its detail panel. Selected bookmarks are filled in brass. Open **Favourites** in the category navigation for quick access; search, Copilot and effort filters work within that collection. Selecting the bookmark again removes it. Removing the last saved prompt shows an empty state with a route back to the full catalogue.

Favourites are stored in this browser's local storage using stable prompt IDs, separately for each hosted site path or local HTML file. Local-file storage depends on the browser; moving or renaming the HTML file may start a new favourites list. They survive reloads and stay in sync between tabs of the same site, but do not sync across browsers or devices. Clearing site data removes them. They are personal to the browser profile, not an organisational account. If storage is blocked or full, the app keeps favourites for the current visit and explains that changes cannot be saved. Removed catalogue entries are not shown, while their IDs are retained in case the entries return. No favourite data is sent to Microsoft Forms or added to the published catalogue.

A hosted `?view=favourites` URL or local `#?view=favourites` link opens the current browser's favourites; it does not share someone else's saved list. **Copy link** from a prompt continues to share only that prompt.

## Connect submissions

Follow [the Microsoft Forms setup guide](docs/microsoft-forms.md). Put the generated prefilled **response** link in `CONFIG.submissionUrl` in `config.js`, then regenerate `index.html` with `npm run build`. It must use HTTPS and a Microsoft Forms domain. An empty link deliberately leaves submissions unavailable. Do not put an editing, collaboration or response-summary link there.

Basic and Premium, Work IQ and the effort-level choices are organisation-supplied labels, not assertions about Microsoft's current licensing or model availability. Update the choice lists in `config.js` and the Form together. The first 12 templates use manually supplied inputs and do not rely on Security Copilot integrations.

## Connect ratings

A separate Microsoft Form collects a required 1–5 usefulness rating and an optional comment. The **Rate** action appears on every card and in the detail panel. It opens Forms in a new tab with the stable prompt ID and current title prefilled; the user chooses their score in Forms.

Follow the [rating form setup](docs/microsoft-forms.md#prompt-ratings). Generate a prefilled response URL using the exact answer markers `CPL_PROMPT_ID` and `CPL_PROMPT_TITLE`, then paste it unchanged into `CONFIG.ratingFormUrl` in `config.js` and regenerate `index.html`. The app replaces only those two answer values and safely encodes the prompt identity. A missing or unrecognised URL keeps rating actions visibly unavailable. The validator catches a configured URL that does not match the expected structure.

Feedback stays in Forms for private review; this version does not import responses or display averages. Opening the form does not count as a submitted rating. Keep raw feedback and respondent identities out of the catalogue. Use the stable ID when reviewing feedback, and recheck the generated link after editing or recreating form questions.

## Review and publish a submission

1. Review the response privately in Microsoft Forms. Check clarity, usefulness, duplicates, attribution and whether the prompt's requested capability matches its declared requirements. Decide whether to accept or request revisions.
2. Test an accepted prompt in the organisation's Copilot environment. Record actual validation honestly; retain `Awaiting internal validation` until it has been checked.
3. Add only approved catalogue fields to `prompts.json`, following the example below. Pick a unique stable slug. Keep the ID when editing an existing prompt so shared links continue to work.
4. Regenerate `index.html` with `npm run build`, then run validation and tests. Open the HTML file and check the entry's search results, requirements and copy output.
5. Review the proposed change in GitHub, merge it, and distribute the updated `index.html` to intended recipients. If using private Pages, run the manual deployment workflow and check the resulting page. To roll back, restore the earlier HTML file or revert the source change, rebuild and redeploy.

Raw Forms exports, private contact information and rejected/pending submissions do not belong in this repository or deployment. The validator rejects unknown record/source fields; `.gitignore` also excludes common export formats. These checks supplement review, not replace it. The deployed artifact includes only the explicit public-site files, not docs, tests or raw exports.

```json
{
  "id": "your-stable-prompt-id",
  "title": "A clear task-oriented title",
  "category": "Security operations",
  "description": "What the prompt helps someone accomplish.",
  "prompt": "The full prompt with [PLACEHOLDERS].",
  "impactBenefits": "The expected practical benefit, without invented results.",
  "author": "The submitting author's display name",
  "copilotRequirement": "Basic",
  "workIqRequired": null,
  "effortLevel": "Auto",
  "otherEffortLevel": null,
  "sources": [],
  "validationStatus": "Awaiting internal validation"
}
```

For Premium, set `workIqRequired` explicitly to `true` or `false`. For Basic, it must be `null`. For Other effort, put the selected description in `otherEffortLevel`; otherwise use `null`. Source objects contain only `title`, `author` and an HTTPS `url`. All named text fields are required, except the conditional Other value. Prompts are limited to 4,000 characters to match the form. After internal testing, the other supported validation status is `Internally validated`.

## Private GitHub Pages deployment

The source repository is `fiberwings/ai-prompt-catalogue` (private). No Pages deployment has been made. Hosting is optional; the standalone file needs none. The app itself implements no authentication: control who receives the HTML file, and use hosting that enforces organisation-only access when deploying it.

1. Use an organisation-owned private repository with private GitHub Pages available. On GitHub.com, private Pages requires GitHub Enterprise Cloud. A private repository alone does not make a Pages site private. [GitHub access-control documentation](https://docs.github.com/en/enterprise-cloud%40latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site).
2. Add this project to that repository. In Settings → Pages, choose GitHub Actions as the publishing source and set site visibility to private. If private visibility is unavailable, stop here; do not switch to public hosting.
3. Ensure intended staff have repository read access and check that unwanted outside collaborators cannot access it. Private Pages follows repository access, which is not automatically identical to employee membership.
4. Run **Deploy private prompt library** from Actions. The workflow checks the Pages API's `public` flag and refuses to publish unless it is exactly `false`. A failed lookup also stops publication. It validates the catalogue and packages only site assets plus attribution notices. It does not change site visibility or create a repository.
5. Test with an authorised colleague, a signed-out browser, and an unauthorised account. Check the main page, which includes the complete catalogue in its HTML. Confirm a deep prompt link still works after sign-in. Verify a real Form submission, its review and publication before announcing the service.

Deployment is manual so each content update can be reviewed. The validation workflow runs on pushes and pull requests. Use GitHub Actions results for deployment monitoring; the app shows a retryable error if its catalogue cannot load. For corporate GitHub Enterprise Server or a dedicated enterprise domain, validate the Pages access model and workflow support with its administrator before adopting this GitHub.com workflow.

## Starter content and provenance

The starter prompts are AI-assisted adaptations written for this catalogue from the referenced workflows, not verbatim vendor prompts. `Library adaptation` identifies that authorship rather than attributing the rewritten text to an individual. Each entry links the sources that informed it. They have been structurally validated but have not been executed in the organisation's Copilot environment. No measured impact is claimed.

CyberPrompts is MIT-licensed; its copyright and licence are retained in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). Microsoft Learn material is referenced for workflow concepts and prompting guidance. No product logo or branded Microsoft interface is reproduced.

## Project layout

`index.html` is the complete, ready-to-open app. Its editable page template is `src/index.template.html`; `styles.css` and `app.js` define the interface, `core.js` holds filtering, navigation and validation, `config.js` holds settings, and `prompts.json` is the approved catalogue. `scripts/build-standalone.mjs` embeds these into the delivered HTML. `scripts/` also contains optional preview and validation utilities, `tests/` contains development tests, and `.github/workflows/` contains checks and manual deployment. No runtime dependencies are required.
