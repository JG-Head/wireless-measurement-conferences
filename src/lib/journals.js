export const BLANK = "Not stated on the pages checked.";

export function journalPublishers(journals) {
  return [...new Set(journals.map((journal) => journal.publisher).filter(Boolean))].sort();
}

export function openIssues(journal) {
  return [...(journal.special_issues || [])].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
}

export function filterJournals(journals, state) {
  const query = String(state.jq || "").trim().toLowerCase();
  return journals
    .filter((journal) => {
      if (state.jpub && state.jpub !== "all" && journal.publisher !== state.jpub) return false;
      if (state.jtop && !journal.percentile) return false;
      const access = journal.open_access;
      if (state.joa === "full" && access?.model !== "full") return false;
      if (state.joa === "hybrid" && access?.model !== "hybrid") return false;
      if (state.joa === "apc" && access?.charges !== true) return false;
      if (state.jissue && !openIssues(journal).length) return false;
      if (state.jvia && !viaConference(journal)) return false;
      if (!query) return true;
      const haystack = [
        journal.name,
        journal.acronym,
        journal.former_name,
        journal.publisher,
        journal.publisher_detail,
        journal.fit,
        journal.scope,
        journal.submissionVia?.conference
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => a.acronym.localeCompare(b.acronym, "en"));
}

export function journalResultText(shown, total) {
  if (!total) return "No Q1 journals in the data file";
  if (shown === total) return `${total} Q1 ${total === 1 ? "journal" : "journals"}`;
  return `${shown} of ${total} Q1 journals`;
}

export function journalStats(journals) {
  const top = journals.filter((journal) => journal.percentile).length;
  const full = journals.filter((journal) => journal.open_access?.model === "full").length;
  const issues = journals.filter((journal) => openIssues(journal).length).length;
  return [
    { key: "q1", text: `${journals.length} Q1 journals` },
    { key: "top", text: `${top} in a top percentile` },
    { key: "oa", text: `${full} fully open access` },
    { key: "issues", text: `${issues} with an open special issue` }
  ];
}

export function viaConference(journal) {
  const via = journal?.submissionVia;
  if (!via || typeof via !== "object") return null;
  if (!via.conference || !via.eventId || !via.sourceUrl) return null;
  return via;
}

export function viaLabel(journal) {
  const via = viaConference(journal);
  return via ? `Solo vía conferencia: ${via.conference}` : "";
}

export function journalSubmitUrl(journal) {
  const via = viaConference(journal);
  if (via) return via.sourceUrl;
  return journal?.submission_url || "";
}

export function money(access) {
  if (!access || access.charges == null) return "";
  if (access.charges === false) return "No APC stated";
  if (access.amount == null) return "APC amount not stated";
  const formatted = Number(access.amount).toLocaleString("en-US");
  const currency = access.currency === "USD" ? "US$" : `${access.currency || ""} `;
  const year = access.year ? ` (${access.year})` : "";
  return `${currency}${formatted}${year}`;
}

export function accessLabel(access) {
  if (!access?.model) return "";
  if (access.model === "full") return "Full open access";
  if (access.model === "hybrid") return "Hybrid open access";
  return access.model;
}

export function quartileLabel(quartile) {
  if (!quartile) return "";
  const metric = quartile.metric ? `${quartile.metric} ` : "";
  const value = quartile.sjr != null ? ` ${metric}${quartile.sjr}` : "";
  return `${quartile.value}${value} · ${quartile.category} · ${quartile.year}`;
}

export function metricLine(journal) {
  const parts = [];
  if (journal.impact_factor?.value != null) {
    parts.push(`JIF ${journal.impact_factor.value} (${journal.impact_factor.year})`);
  }
  if (journal.citescore?.value != null) {
    parts.push(`CiteScore ${journal.citescore.value} (${journal.citescore.year})`);
  }
  return parts.join(" · ");
}
