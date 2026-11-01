export const CONFIG = Object.freeze({
  // Use the Microsoft Forms-generated prefilled response URL (Basic + Auto).
  submissionUrl: "",
  // Generate a separate Forms prefilled response link with the text answers
  // CPL_PROMPT_ID and CPL_PROMPT_TITLE. Paste the entire link unchanged here.
  // See docs/microsoft-forms.md. Empty keeps rating actions unavailable.
  ratingFormUrl: "",
  categories: [
    "Security operations", "Incident response", "Threat intelligence",
    "Vulnerability management", "Detection engineering", "Governance and risk"
  ],
  tiers: ["Basic", "Premium"],
  effortLevels: [
    "Auto", "Quick response", "Think deeper", "GPT-5.6 Quick response", "GPT-6",
    "GPT-5.6 Sol Think deeper", "GPT-6.1 Sol", "Other"
  ],
  defaults: { copilotRequirement: "Basic", effortLevel: "Auto" }
});
