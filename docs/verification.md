# Verification record

Checked 1 November 2026.

## Passed

- Catalogue validation: 12 entries, six categories, two entries per category; all source links, IDs, defaults and conditional fields valid.
- Eight Node test groups: complete starter data; matching every published field; multi-field and accent-insensitive search/ranking; combined filters/reset; invalid/private field rejection; Premium/Other requirements; safe URLs; WCAG AA contrast for the semantic text colour pairs.
- Browser: searching `DMARC` finds the email-triage template through its full prompt text; Premium with the Basic-only starter data produces the designed no-results state; clearing filters restores the collection.
- Clipboard: copied email-triage text equals the detail panel's full prompt character-for-character. A browser fixture denying clipboard writing opens the manual-copy dialog with selectable prompt text.
- Routing: direct prompt links work under a repository subpath; browser Back restores the filtered catalogue; Escape closes details and restores focus to the originating card.
- Responsive layout: desktop inspection at 1280 pixels and a real 390-pixel iframe viewport. A discovered mobile overflow was fixed; document scroll width now equals the 390-pixel viewport.
- Safe rendering: a test record containing HTML-like title and script-like prompt content displays those strings literally; no injected image or script elements are created. Premium, Work IQ and a custom Other effort label display correctly.
- Empty catalogue and failed data request show their intended states, with a retry control for failure.

Browser scenario fixtures were kept outside the delivered catalogue and its deployment artifact.

## Pending external setup

- Microsoft Forms opened to a sign-in flow; an authenticated organisation session was not available for creating the real form. The exact field specification, forward branching, prefilled-link defaults and acceptance trial are in microsoft-forms.md. Its URL is intentionally empty in config.js.
- No organisation GitHub repository destination has been supplied. Private Pages publication, authorised/unauthorised access checks and the live submission-to-publication trial have not been performed.
- Starter prompts have not been executed or validated in the organisation's Copilot environment. The application labels them accordingly.

## Prompt ratings update

- Ten Node test groups pass, including rating link identity/encoding and rejection of absent, unsafe or ambiguous templates. Catalogue validation and JavaScript syntax checks pass.
- Browser fixtures: all 12 configured card actions contain their own prompt ID and title, use a new tab and `noopener noreferrer`; the detail panel uses the matching link. No real Forms URL was invented or visited during these fixture tests.
- Keyboard navigation reaches the detail rating action with a visible focus indicator. At a 390-pixel iframe viewport, card actions fit without horizontal page overflow and the detail panel fits its viewport (389-pixel content width and scroll width).
- Missing and invalid form settings produce disabled card actions and the explanatory detail state. The configuration in the delivered site remains empty.
- The real rating form, generated question IDs, organisation access checks and an actual rating submission remain pending. Follow the Prompt ratings section of microsoft-forms.md.

## Favourites update

- Fifteen Node test groups pass. Added coverage for reload persistence, separate site paths, stable IDs after renaming, search/filter combinations, unknown or corrupt saved data, blocked/full storage, and updates between tabs.
- Browser: card bookmarks save and restore after reloading; the Favourites category and count update immediately. Search and Copilot filters narrow saved prompts, and clearing a no-results search stays within Favourites.
- Detail-panel removal updates the underlying collection while keeping the panel open and keyboard focus on its toggle. Removing the final favourite shows the dedicated empty state and returns focus to the Favourites navigation button.
- Mobile: bookmarks work by keyboard at 390 pixels, with no horizontal page overflow. A second tab immediately reflects the saved selection through the browser storage event.
- A browser fixture with local storage blocked keeps favourites for the current visit and displays the expected persistence warning without breaking browsing.
- All favourites used for browser verification were in a separate local test site. No demonstration favourites were added to the delivered library's browser storage.
