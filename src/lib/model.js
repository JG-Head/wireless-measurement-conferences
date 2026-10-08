export const SOON_DAYS = 90;
export const HIGH_SERIES = ["IMC", "DySPAN", "CoNEXT", "SIGMETRICS", "PAM", "TMA", "PIMRC", "EuCNC", "WCNC"];
export const ORGANIZERS = ["IEEE", "ACM", "Other"];
export const VIEWS = ["list", "map", "timeline"];
export const SORTS = ["date", "deadline", "affinity", "name", "country", "status"];

const DEADLINE_LABELS = {
  abstract: "Abstract",
  paper: "Paper",
  notification: "Notification",
  camera_ready: "Camera-ready"
};
const DEADLINE_ORDER = ["abstract", "paper", "notification", "camera_ready"];
const SUBMISSION_KEYS = new Set(["abstract", "paper"]);
const AFFINITY_RANK = { high: 0, medium: 1, low: 2 };
const STATUS_RANK = { Confirmed: 0, Announced: 1 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const REGION_ORDER = ["Europe", "North America", "Americas", "South America", "Asia", "Middle East"];

export function safeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch {
    return "";
  }
  return "";
}

export function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return isoFromDate(new Date());
}

export function daysFromToday(iso, today = todayISO()) {
  return Math.round((parseDate(iso) - parseDate(today)) / 86400000);
}

export function formatDay(iso) {
  if (!iso) return "TBD";
  const date = parseDate(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatMonthYear(iso) {
  const date = parseDate(iso);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatRange(start, end) {
  if (!start) return "Dates TBD";
  if (!end || start === end) return formatDay(start);
  const a = parseDate(start);
  const b = parseDate(end);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${a.getFullYear()}`;
  }
  return `${formatDay(start)} – ${formatDay(end)}`;
}

export function relLabel(delta) {
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta > 1) return `in ${delta} days`;
  if (delta === -1) return "yesterday";
  return `${Math.abs(delta)} days ago`;
}

export function deadlineEntries(event) {
  const raw = event.deadlines || {};
  return Object.keys(raw)
    .filter((key) => raw[key])
    .sort((a, b) => {
      const ia = DEADLINE_ORDER.indexOf(a);
      const ib = DEADLINE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((key) => ({
      key,
      label: DEADLINE_LABELS[key] || key.replace(/_/g, " "),
      date: raw[key]
    }));
}

export function submissionEntries(event) {
  return deadlineEntries(event).filter((item) => SUBMISSION_KEYS.has(item.key));
}

export function nextDeadline(event, today = todayISO()) {
  return submissionEntries(event)
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

export function lastPastDeadline(event, today = todayISO()) {
  return submissionEntries(event)
    .filter((item) => item.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

export function cfpRole(event, today = todayISO()) {
  if (event.attend_only) return "attend";
  const subs = submissionEntries(event);
  if (subs.some((item) => item.date >= today)) return "open";
  if (subs.length) return "closed";
  return "upcoming";
}

export function isSubmissionOpportunity(event, today = todayISO()) {
  const role = cfpRole(event, today);
  return role === "open" || role === "upcoming";
}

export function cfpShort(event, today = todayISO()) {
  const role = cfpRole(event, today);
  if (role === "open") return "Open CFP";
  if (role === "upcoming") return "CFP date not in file";
  return "Attend only";
}

export function cfpBlurb(event, today = todayISO()) {
  const role = cfpRole(event, today);
  if (role === "open") return "Open CFP: a paper or abstract deadline in this file is still ahead.";
  if (role === "upcoming") return "CFP date not in this file. The edition stays on the list; no deadline was invented.";
  const past = lastPastDeadline(event, today);
  if (past) return `Attend only. The ${past.label.toLowerCase()} deadline ${formatDay(past.date)} has passed.`;
  return "Attend only. No open paper deadline is listed, so this is not a submission target.";
}

export function hasSoonDeadline(event, today = todayISO()) {
  const next = nextDeadline(event, today);
  if (!next) return false;
  const delta = daysFromToday(next.date, today);
  return delta >= 0 && delta <= SOON_DAYS;
}

export function isNow(event, today = todayISO()) {
  return Boolean(event.start && event.end && event.start <= today && today <= event.end);
}

export function isOwnVenue(event, userVenues) {
  return (userVenues || []).some((venue) => {
    const value = venue.toLowerCase();
    return value === String(event.series || "").toLowerCase() || value === String(event.name || "").toLowerCase();
  });
}

export function isHighSeries(series) {
  return HIGH_SERIES.some((item) => item.toLowerCase() === String(series || "").toLowerCase());
}

export function statusClass(status) {
  const known = String(status || "").toLowerCase();
  if (known === "confirmed" || known === "announced") return known;
  return "neutral";
}

export function affinityLabel(affinity) {
  if (!affinity) return "Venue fit";
  return affinity.charAt(0).toUpperCase() + affinity.slice(1);
}

export function labUnits(labs) {
  return (labs && labs.units) || [];
}

export function labById(labs, id) {
  return labUnits(labs).find((unit) => unit.id === id) || null;
}

export function matchesLabs(record, selected) {
  if (!selected.length) return true;
  const tags = record.affinity_units || [];
  return selected.some((id) => tags.includes(id));
}

export function matchesOrganizer(record, selected) {
  if (!selected.length) return true;
  return selected.includes(record.organizer);
}

export function eventLabs(event, labs) {
  return (event.affinity_units || []).map((id) => labById(labs, id)).filter(Boolean);
}

function haystack(event, labs) {
  const labText = (event.affinity_units || []).flatMap((id) => {
    const unit = labById(labs, id);
    if (!unit) return [];
    return [unit.name, unit.contact, ...(unit.members || []), ...(unit.themes || [])];
  });
  return [
    event.acronym, event.name, event.series, event.organizer, event.organizer_detail, event.city, event.country,
    event.topic_fit, event.tier_note, event.standing, event.notes, event.region, event.status,
    event.spain ? "spain españa" : "",
    labText.join(" ")
  ].join(" ").toLowerCase();
}

export function filterEvents(events, state, labs, today = todayISO()) {
  const query = state.q.trim().toLowerCase();
  return events.filter((event) => {
    if (state.submissions && !isSubmissionOpportunity(event, today)) return false;
    if (state.spain && !event.spain) return false;
    if (state.region !== "all" && event.region !== state.region) return false;
    if (state.status !== "all" && event.status !== state.status) return false;
    if (state.affinity !== "all" && event.affinity !== state.affinity) return false;
    if (state.soon && !hasSoonDeadline(event, today)) return false;
    if (!matchesOrganizer(event, state.organizers)) return false;
    if (!matchesLabs(event, state.labs)) return false;
    if (!query) return true;
    return haystack(event, labs).includes(query);
  });
}

export function compareEvents(a, b, state, today = todayISO()) {
  if (state.sort === "deadline") {
    const da = nextDeadline(a, today);
    const db = nextDeadline(b, today);
    if (!da && !db) return a.start.localeCompare(b.start);
    if (!da) return 1;
    if (!db) return -1;
    const byDate = da.date.localeCompare(db.date) || a.start.localeCompare(b.start);
    return state.dir === "asc" ? byDate : -byDate;
  }
  let result = 0;
  if (state.sort === "name") result = a.acronym.localeCompare(b.acronym);
  else if (state.sort === "country") result = a.country.localeCompare(b.country) || a.city.localeCompare(b.city);
  else if (state.sort === "affinity") result = (AFFINITY_RANK[a.affinity] ?? 9) - (AFFINITY_RANK[b.affinity] ?? 9);
  else if (state.sort === "status") result = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
  else result = a.start.localeCompare(b.start);
  if (result === 0) result = a.start.localeCompare(b.start) || a.acronym.localeCompare(b.acronym);
  return state.dir === "asc" ? result : -result;
}

export function sortEvents(events, state, today = todayISO()) {
  return events.slice().sort((a, b) => compareEvents(a, b, state, today));
}

export function soonItems(events, state, today = todayISO()) {
  const items = [];
  events.forEach((event) => {
    if (state.labs.length && !matchesLabs(event, state.labs)) return;
    if (!matchesOrganizer(event, state.organizers)) return;
    if (cfpRole(event, today) !== "open") return;
    submissionEntries(event).forEach((item) => {
      if (item.date < today) return;
      const delta = daysFromToday(item.date, today);
      if (delta >= 0 && delta <= SOON_DAYS) items.push({ event, ...item, delta });
    });
  });
  items.sort((a, b) => a.date.localeCompare(b.date) || a.event.acronym.localeCompare(b.event.acronym));
  return items;
}

export function happeningNow(events, state, today = todayISO()) {
  return events
    .filter((event) => isNow(event, today) && matchesLabs(event, state.labs) && matchesOrganizer(event, state.organizers))
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function sortedRegions(events) {
  const regions = [...new Set(events.map((event) => event.region).filter(Boolean))];
  regions.sort((a, b) => {
    const ia = REGION_ORDER.indexOf(a);
    const ib = REGION_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return regions;
}

export function sortedStatuses(events) {
  const statuses = [...new Set(events.map((event) => event.status).filter(Boolean))];
  statuses.sort((a, b) => (STATUS_RANK[a] ?? 9) - (STATUS_RANK[b] ?? 9) || a.localeCompare(b));
  return statuses;
}

export function sortedAffinities(events) {
  const affinities = [...new Set(events.map((event) => event.affinity).filter(Boolean))];
  affinities.sort((a, b) => (AFFINITY_RANK[a] ?? 9) - (AFFINITY_RANK[b] ?? 9));
  return affinities;
}

export function watchingItems(data, state, labs) {
  return (data?.watching || []).filter((item) => matchesLabs(item, state.labs) && matchesOrganizer(item, state.organizers));
}

export function watchingIntro(items, state) {
  if (items.length) {
    return "CFP not open yet. These series have no dated edition in the file, so they are not on the map or timeline. Cities and deadlines stay out until a primary announcement exists.";
  }
  if (state.labs.length && !state.organizers.length) {
    return "None of the undated series is tagged for the selected labs.";
  }
  return "None of the undated series matches these filters.";
}

export function emptyLead(state, data, labs) {
  if (state.labs.length) {
    const names = state.labs.map((id) => labById(labs, id)?.name || id).join(", ");
    const watching = (data.watching || [])
      .filter((item) => matchesLabs(item, state.labs) && matchesOrganizer(item, state.organizers))
      .map((item) => item.series);
    if (watching.length) {
      return `No dated event in this list is tagged for ${names}. ${watching.join(", ")} ${watching.length === 1 ? "is" : "are"} under Still watching.`;
    }
    const note = state.labs.map((id) => labById(labs, id)?.link).find(Boolean);
    return note || `No venue on this calendar is tagged for ${names}.`;
  }
  if (state.submissions && state.spain) {
    return "No Spain meeting in the file still has an open paper deadline. Turn off Submission opportunities to see attend-only events such as CNSM 2026.";
  }
  if (state.submissions) return "No submission opportunities match these filters.";
  return "No events match these filters.";
}

export function resultText(shown, data, state, labs, today = todayISO()) {
  const events = data.events || [];
  const pool = state.submissions ? events.filter((event) => isSubmissionOpportunity(event, today)).length : events.length;
  const hidden = events.filter((event) => !isSubmissionOpportunity(event, today)).length;
  const spainNote = state.spain ? " · Spain only (solo España)" : "";
  const soonNote = state.soon ? ` · paper deadlines within ${SOON_DAYS} days` : "";
  const orgNote = state.organizers.length ? ` · organizer: ${state.organizers.join(", ")}` : "";
  const labNote = state.labs.length
    ? ` · labs: ${state.labs.map((id) => labById(labs, id)?.name || id).join(", ")}`
    : "";
  if (state.submissions) {
    return `Showing ${shown} of ${pool} submission opportunities${spainNote}${soonNote}${orgNote}${labNote}. ${hidden} attend-only ${hidden === 1 ? "meeting is" : "meetings are"} hidden.`;
  }
  return `Showing ${shown} of ${pool} events, including attend-only${spainNote}${soonNote}${orgNote}${labNote}`;
}

export function buildTimeline(events, windowFrom, windowTo, today = todayISO()) {
  const dayWidth = 3.15;
  const cardWidth = 156;
  const origin = parseDate(windowFrom);
  const xFor = (iso) => ((parseDate(iso) - origin) / 86400000) * dayWidth;
  const span = Math.max(1, (parseDate(windowTo) - origin) / 86400000);
  const width = Math.ceil(span * dayWidth + cardWidth + 48);
  const placed = events
    .filter((event) => event.start)
    .map((event) => ({ event, x: Math.max(8, xFor(event.start)), w: cardWidth }))
    .sort((a, b) => a.x - b.x || a.event.acronym.localeCompare(b.event.acronym));
  const laneEnds = [];
  placed.forEach((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.x);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    item.lane = lane;
    laneEnds[lane] = item.x + item.w + 10;
  });
  const lanePitch = 112;
  const header = 54;
  const height = header + Math.max(laneEnds.length, 1) * lanePitch + 16;
  const months = [];
  const cursor = parseDate(windowFrom);
  const end = parseDate(windowTo);
  cursor.setDate(1);
  while (cursor <= end) {
    const iso = isoFromDate(cursor);
    const date = parseDate(iso);
    const label = date.getMonth() === 0 || months.length === 0
      ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
      : MONTHS[date.getMonth()];
    months.push({ iso, x: xFor(iso), label });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const years = [];
  const startYear = parseDate(windowFrom).getFullYear();
  const endYear = parseDate(windowTo).getFullYear();
  for (let year = startYear; year <= endYear; year += 1) {
    const from = year === startYear ? windowFrom : `${year}-01-01`;
    const to = year === endYear ? windowTo : `${year + 1}-01-01`;
    years.push({ year, x: xFor(from), w: Math.max(0, xFor(to) - xFor(from)), alt: (year - startYear) % 2 === 1 });
  }
  return {
    width,
    height,
    header,
    lanePitch,
    placed,
    months,
    years,
    showToday: today >= windowFrom && today <= windowTo,
    todayX: xFor(today),
    fromLabel: formatMonthYear(windowFrom),
    toLabel: formatMonthYear(windowTo)
  };
}

export function readFilters(params) {
  const view = params.get("view");
  const sort = params.get("sort");
  const layout = params.get("layout");
  const narrow = typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
  return {
    view: VIEWS.includes(view) ? view : "list",
    q: params.get("q") || "",
    spain: params.get("spain") === "1",
    region: params.get("region") || "all",
    status: params.get("status") || "all",
    affinity: params.get("affinity") || "all",
    soon: params.get("soon") === "1",
    submissions: params.get("submissions") !== "0",
    organizers: ORGANIZERS.filter((name) => (params.get("organizer") || "").split(",").includes(name)),
    labs: (params.get("labs") || "").split(",").map((item) => item.trim()).filter(Boolean),
    sort: SORTS.includes(sort) ? sort : "date",
    dir: params.get("dir") === "desc" ? "desc" : "asc",
    layout: layout === "cards" || layout === "table" ? layout : (narrow ? "cards" : "table"),
    layoutTouched: layout === "cards" || layout === "table",
    event: params.get("event") || null
  };
}

export function writeFilters(state) {
  const url = new URL(location.href);
  const params = url.searchParams;
  const set = (key, value, fallback) => {
    if (value === fallback || value === "" || value == null) params.delete(key);
    else params.set(key, String(value));
  };
  set("view", state.view, "list");
  set("q", state.q, "");
  set("spain", state.spain ? "1" : "", "");
  set("region", state.region, "all");
  set("status", state.status, "all");
  set("affinity", state.affinity, "all");
  set("soon", state.soon ? "1" : "", "");
  set("submissions", state.submissions ? "" : "0", "");
  set("organizer", state.organizers.join(","), "");
  set("labs", state.labs.join(","), "");
  set("sort", state.sort, "date");
  set("dir", state.dir, "asc");
  if (state.layoutTouched) set("layout", state.layout, "table");
  else params.delete("layout");
  set("event", state.event, null);
  history.replaceState(null, "", url);
}
