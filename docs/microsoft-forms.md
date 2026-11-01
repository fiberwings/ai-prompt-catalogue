# Microsoft Forms setup

Status: form URL and organisation account access must be supplied before this integration can go live. This guide is the exact form specification; the website does not impersonate a working submission endpoint.

## Form identity and access

Create a form named **Submit a Copilot prompt** under the organisation's Microsoft 365 account. Prefer a team-owned form so ownership survives staffing changes.

Description:

> Share a reusable prompt that helps colleagues do useful work. Submissions are reviewed before publication in the organisation's Prompt Library. Use placeholders in place of confidential details. Your author display name and approved prompt details will appear in the library.

In Collect responses select **Only people in my organisation can respond**. Record respondent identity for private review if your organisation requires it, but retain a separate author display-name question. Leave **One response per person** off so colleagues can submit more than one prompt. Do not publish a response-summary link.

## Questions, in this order

All questions are required when shown. Keep the wording stable to simplify manual publication.

| Number | Question | Type and options | Help text |
| --- | --- | --- | --- |
| 1 | Copilot requirement | Choice: Basic; Premium | Select the minimum requirement for using your prompt. Basic is the default. |
| 2 | Does Work IQ need to be enabled? | Choice: Yes; No | Shown only for Premium. Select explicitly. |
| 3 | Effort level | Choice, single answer, dropdown: Auto; Quick response; Think deeper; GPT-5.6 Quick response; GPT-6; GPT-5.6 Sol Think deeper; GPT-6.1 Sol; Other | Auto is the default. These are the organisation's catalogue labels. |
| 4 | Other effort level | Text, short answer | Describe the effort or model setting to select. |
| 5 | Title | Text, short answer | Name the task clearly, such as “Triage a suspicious email”. |
| 6 | Category | Choice, dropdown: Security operations; Incident response; Threat intelligence; Vulnerability management; Detection engineering; Governance and risk | Choose the main task this prompt supports. |
| 7 | Description | Text, long answer | Explain what the prompt does and when a colleague should use it. |
| 8 | Prompt | Text, long answer | Paste the complete reusable prompt. Maximum 4,000 characters. Use [BRACKETED PLACEHOLDERS] for inputs that change. |
| 9 | Impact and benefits | Text, long answer | Explain the practical value. Distinguish expected benefits from results you have actually measured. |
| 10 | Author | Text, short answer | Your display name as it should appear in the organisation's library. |
| 11 | Source attribution, if adapted | Text, long answer; optional | Include the original author, title and source link if this builds on someone else's work. |

## Branching and defaults

Create all questions first. Use forward-only branching:

- Q1 Basic → Q3. Q1 Premium → Q2. Both Q2 answers → Q3.
- Q3 Other → Q4. Every other effort answer → Q5. Q4 → Q5.
- Q5 through Q11 continue sequentially, then submit.

Use a separate Q4 rather than the choice question's built-in Other box, so the question labels and data mapping remain explicit.

In the form's menu, use **Get pre-filled URL**. Enable prefilled answers, choose Basic for Q1 and Auto for Q3, leave the remaining fields empty, and generate the response link. Use that generated link in `CONFIG.submissionUrl`; do not fabricate question IDs or handcraft an undocumented submission API. Confirm the generated link remains editable and that changing Basic to Premium reveals Q2.

If the tenant's Forms version does not offer prefilled links, leave connection pending until a supported way to preserve the required defaults is agreed. Do not silently drop the defaults.

Confirmation text:

> Thank you. Your prompt has been submitted for review. It will appear in the library after a maintainer approves and publishes it.

## Map an approved response

| Form question | Catalogue field |
| --- | --- |
| Q1 | `copilotRequirement` |
| Q2 | `workIqRequired`: true for Yes, false for No; null for Basic |
| Q3 | `effortLevel` |
| Q4 | `otherEffortLevel`: trimmed text for Other; otherwise null |
| Q5 | `title` |
| Q6 | `category` |
| Q7 | `description` |
| Q8 | `prompt` (preserve line breaks) |
| Q9 | `impactBenefits` |
| Q10 | `author` |
| Q11 | Review and convert into `sources` entries with title, author and HTTPS URL |

The maintainer adds a unique `id` and an honest `validationStatus`. Clear values from skipped questions even if they remain in an export after a respondent changes an earlier answer. Validate JSON before publishing. Keep recorded identity, email, submission timestamps, review discussion and rejected text in Forms, outside the published catalogue.

## Acceptance trial before launch

1. Open the website's configured link as an authorised colleague. Verify Basic and Auto are prefilled; Work IQ and Other text are hidden.
2. Change to Premium. Verify Work IQ appears and Yes/No is required. Test both answers. Change back to Basic and verify it skips Work IQ.
3. Select every effort option. Only Other should show the required free-text question. Changing back to Auto must skip it.
4. Submit a synthetic prompt under 4,000 characters with multiline formatting. Check all fields in the response. Verify multiple submissions are allowed.
5. Attempt access signed out and with an external account; confirm organisation-only restrictions.
6. Review the test submission, copy only approved fields to the catalogue, validate, preview, publish privately and verify search/copy. Remove the synthetic catalogue entry afterwards through a normal reviewed change.

The application tests validate data defaults and conditional rules. This actual tenant-level Forms trial remains pending until the live form exists.

References: [Microsoft branching](https://support.microsoft.com/en-us/forms/use-branching-logic-in-microsoft-forms), [prefilled responses](https://techcommunity.microsoft.com/blog/microsoftformsblog/pre-fill-responses-in-your-microsoft-forms/4144232), [Forms limits](https://support.microsoft.com/en-us/forms/form-question-response-and-character-limits-in-microsoft-forms), [organisation-only sharing](https://support.microsoft.com/en-us/forms/send-a-form-and-collect-responses).

## Prompt ratings

Status: website integration is ready; a new organisation-owned rating form and its generated prefilled link still need to be configured. This is separate from the submission form.

Create **Rate a Cyber Prompt Library prompt** with this description:

> Tell us how useful this prompt was for your task. Choose a score after trying it and optionally suggest an improvement. Feedback is reviewed by library maintainers.

Use **Only people in my organisation can respond**. Leave **One response per person** off: that setting applies to the whole form and would prevent someone from rating a second prompt. For reviewable feedback, enable **Record name**, and retain those identities only in Forms. Explain that feedback is visible to maintainers; do not describe it as anonymous. Do not share a response-summary link.

| Order | Question | Type | Required | Guidance |
| --- | --- | --- | --- | --- |
| 1 | Prompt ID | Text, short answer | Yes | Prefilled by the library. Please leave this reference unchanged. |
| 2 | Prompt title | Text, short answer | Yes | Prefilled by the library so you can check which prompt you are rating. |
| 3 | How useful was this prompt? | Rating, 5 levels, numbers | Yes | Rate the result after trying the prompt: 1 = Not useful; 2 = Slightly useful; 3 = Moderately useful; 4 = Very useful; 5 = Extremely useful. |
| 4 | What worked well or could be improved? | Text, long answer | No | Optional. Describe your experience or suggest a change; use placeholders instead of confidential evidence. |

No branching is needed. Leave the rating and comment blank by default.

### Connect the rating form

1. In Forms, choose **… → Get pre-filled URL**, then enable prefilled answers.
2. Enter the literal text `CPL_PROMPT_ID` into **Prompt ID**, and `CPL_PROMPT_TITLE` into **Prompt title**. Leave the rating and comment empty.
3. Generate and copy the complete prefilled **response** URL. Do not use a shortened, edit, collaboration or results link. Keep the generated question identifiers intact.
4. Paste that URL, unchanged, as the `ratingFormUrl` string in `config.js`. Keep it separate from `submissionUrl`.
5. Run `npm run validate` and `npm test`, then test the website's rating actions in your tenant before publishing.

The website substitutes the two marker answers in the generated URL's query parameters using the selected prompt's stable ID and title. URL encoding preserves spaces, punctuation and non-English text. It does not send the prompt text, comments or a score, and does not call a Forms submission API. The form opens in a new tab and the user submits the actual rating there.

The supported link format is an HTTPS Microsoft Forms `ResponsePage.aspx` URL with a form `id` and two separate query answer values containing exactly the markers above. If Forms produces a different structure, validation will reject it; keep ratings unavailable and adapt the integration using that actual generated link. Do not invent question IDs. The marker replacement is this library's convenience layer over Forms-generated prefilled links; it must be verified against your tenant's generated URL.

Prefilled answers are editable, so they are not an authentication or integrity mechanism. Verify IDs against `prompts.json` during review; use the stable ID as the key if a prompt is renamed.

Confirmation text:

> Thank you for rating this prompt. Your feedback helps us improve the Cyber Prompt Library.

### Review ratings

Review responses in Forms, grouping by Prompt ID. Check IDs, discard test responses and resolve duplicates before drawing conclusions. If the same colleague rates the same prompt repeatedly, use their latest complete response for any future aggregate. Distinguish repeated votes from ratings of different prompts. Keep identity and free-text feedback private.

The first version collects feedback only. It does not publish average scores, import Forms results, or infer successful submissions from a click. Any later decision to publish aggregates should include the response count and a documented review process.

### Rating acceptance trial

1. With the URL blank, confirm every card shows disabled **Rate · soon** and the detail panel explains ratings are unavailable.
2. With the generated link configured, open **Rate** on two different cards and from the corresponding detail panels. Confirm each opens a new tab with the correct ID and title. Verify the original library tab retains its search and open panel.
3. Confirm the score and comment start empty; submitting without a score is blocked. Test a title containing punctuation, such as `Review A&B + logs`, without changing the real catalogue permanently.
4. As an authorised colleague, submit a test rating and comment, then rate a different prompt. Verify both responses appear in Forms under the correct IDs and the optional comment may be left blank.
5. Test signed-out and external accounts to verify organisation-only access. Verify respondents cannot view other people's responses.
6. Check keyboard navigation and mobile layout, then run validation before the private deployment. Keep live-form testing pending until this entire trial has passed.

Microsoft references: [Rating question types](https://support.microsoft.com/en-us/forms/create-a-form-with-microsoft-forms), [generating prefilled response links](https://techcommunity.microsoft.com/blog/microsoftformsblog/pre-fill-responses-in-your-microsoft-forms/4144232), [response settings](https://support.microsoft.com/en-us/forms/adjust-your-form-or-quiz-settings-in-microsoft-forms).
