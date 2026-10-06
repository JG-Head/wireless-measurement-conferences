/* Wireless measurement conference dashboard.
   Renders only data/conferences.json. Dates, cities, and deadlines are not invented here. */

const DATA_URL = "data/conferences.json";
const SOON_DAYS = 90;
const HIGH_SERIES = ["IMC", "DySPAN", "CoNEXT", "SIGMETRICS", "PAM", "TMA", "PIMRC", "EuCNC", "WCNC"];
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
const VIEWS = ["list", "map", "timeline"];

const state = {
  view: "list",
  q: "",
  spain: false,
  region: "all",
  status: "all",
  affinity: "all",
  soon: false,
  submissions: true,
  sort: "date",
  dir: "asc",
  layout: "table",
  layoutTouched: false,
  event: null
};

let DATA = null;
let map = null;
let markerLayer = null;
let mapFitToken = 0;
let lastFocus = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch (err) {
    return "";
  }
  return "";
}

function parseDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayISO() {
  return isoFromDate(new Date());
}

function daysFromToday(iso) {
  const ms = parseDate(iso) - parseDate(todayISO());
  return Math.round(ms / 86400000);
}

function formatDay(iso) {
  if (!iso) return "TBD";
  const date = parseDate(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatMonthYear(iso) {
  const date = parseDate(iso);
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatRange(start, end) {
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

function relLabel(delta) {
  if (delta === 0) return "today";
  if (delta === 1) return "tomorrow";
  if (delta > 1) return `in ${delta} days`;
  if (delta === -1) return "yesterday";
  return `${Math.abs(delta)} days ago`;
}

function deadlineEntries(event) {
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

function submissionEntries(event) {
  return deadlineEntries(event).filter((item) => SUBMISSION_KEYS.has(item.key));
}

function nextDeadline(event) {
  const today = todayISO();
  return submissionEntries(event)
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
}

function lastPastDeadline(event) {
  const today = todayISO();
  return submissionEntries(event)
    .filter((item) => item.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
}

function cfpRole(event) {
  if (event.attend_only) return "attend";
  const today = todayISO();
  const subs = submissionEntries(event);
  if (subs.some((item) => item.date >= today)) return "open";
  if (subs.length) return "closed";
  return "upcoming";
}

function isSubmissionOpportunity(event) {
  const role = cfpRole(event);
  return role === "open" || role === "upcoming";
}

function cfpShort(event) {
  const role = cfpRole(event);
  if (role === "open") return "Open CFP";
  if (role === "upcoming") return "CFP date not in file";
  return "Attend only";
}

function cfpBlurb(event) {
  const role = cfpRole(event);
  if (role === "open") return "Open CFP: a paper or abstract deadline in this file is still ahead.";
  if (role === "upcoming") return "CFP date not in this file. The edition stays on the list; no deadline was invented.";
  const past = lastPastDeadline(event);
  if (past) return `Attend only. The ${past.label.toLowerCase()} deadline ${formatDay(past.date)} has passed.`;
  return "Attend only. No open paper deadline is listed, so this is not a submission target.";
}

function hasSoonDeadline(event) {
  const next = nextDeadline(event);
  if (!next) return false;
  const delta = daysFromToday(next.date);
  return delta >= 0 && delta <= SOON_DAYS;
}

function isNow(event) {
  const today = todayISO();
  return Boolean(event.start && event.end && event.start <= today && today <= event.end);
}

function isOwnVenue(event) {
  const venues = DATA.user_venues || [];
  return venues.some((venue) => {
    const value = venue.toLowerCase();
    return value === String(event.series || "").toLowerCase() || value === String(event.name || "").toLowerCase();
  });
}

function isHighSeries(series) {
  return HIGH_SERIES.some((item) => item.toLowerCase() === String(series || "").toLowerCase());
}

function statusClass(status) {
  const known = String(status || "").toLowerCase();
  if (known === "confirmed" || known === "announced") return known;
  return "neutral";
}

function affinityLabel(affinity) {
  if (!affinity) return "Affinity";
  return affinity.charAt(0).toUpperCase() + affinity.slice(1);
}

function placeMarks(event) {
  const bits = [];
  if (isNow(event)) bits.push('<span class="pill now">Now</span>');
  if (event.spain) bits.push('<span class="pill spain">España</span>');
  if (isOwnVenue(event)) bits.push('<span class="pill own">Own venue</span>');
  return bits.join("");
}

function pills(event) {
  const bits = [];
  const role = cfpRole(event);
  if (role === "open") bits.push('<span class="pill open">Open CFP</span>');
  else if (role === "upcoming") bits.push('<span class="pill upcoming">CFP date not in file</span>');
  else bits.push('<span class="pill attend">Attend only</span>');
  if (isNow(event)) bits.push('<span class="pill now">Now · En curso</span>');
  if (event.spain) bits.push('<span class="pill spain">Spain · España</span>');
  bits.push(`<span class="pill ${escapeHtml(event.affinity || "neutral")}">${escapeHtml(affinityLabel(event.affinity))} affinity</span>`);
  bits.push(`<span class="pill ${statusClass(event.status)}">${escapeHtml(event.status || "Status")}</span>`);
  if (isOwnVenue(event)) bits.push('<span class="pill own" title="Researcher has published in this series">Own venue</span>');
  return bits.join("");
}

function eventLinks(event) {
  const site = safeUrl(event.site);
  const cfp = safeUrl(event.cfp);
  const links = [];
  if (site) links.push(`<a href="${site}" target="_blank" rel="noopener noreferrer">Official site</a>`);
  if (cfp && cfp !== site) links.push(`<a href="${cfp}" target="_blank" rel="noopener noreferrer">Call for papers</a>`);
  return links.join("");
}

function filteredEvents() {
  const query = state.q.trim().toLowerCase();
  return DATA.events.filter((event) => {
    if (state.submissions && !isSubmissionOpportunity(event)) return false;
    if (state.spain && !event.spain) return false;
    if (state.region !== "all" && event.region !== state.region) return false;
    if (state.status !== "all" && event.status !== state.status) return false;
    if (state.affinity !== "all" && event.affinity !== state.affinity) return false;
    if (state.soon && !hasSoonDeadline(event)) return false;
    if (!query) return true;
    const haystack = [
      event.acronym, event.name, event.series, event.city, event.country,
      event.topic_fit, event.tier_note, event.standing, event.notes, event.region, event.status,
      event.spain ? "spain españa" : ""
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function compareEvents(a, b) {
  if (state.sort === "deadline") {
    const da = nextDeadline(a);
    const db = nextDeadline(b);
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

function sortedEvents() {
  return filteredEvents().slice().sort(compareEvents);
}

function readUrl() {
  const params = new URLSearchParams(location.search);
  const view = params.get("view");
  if (VIEWS.includes(view)) state.view = view;
  state.q = params.get("q") || "";
  state.spain = params.get("spain") === "1";
  state.region = params.get("region") || "all";
  state.status = params.get("status") || "all";
  state.affinity = params.get("affinity") || "all";
  state.soon = params.get("soon") === "1";
  state.submissions = params.get("submissions") !== "0";
  const sort = params.get("sort");
  if (["date", "deadline", "affinity", "name", "country", "status"].includes(sort)) state.sort = sort;
  state.dir = params.get("dir") === "desc" ? "desc" : "asc";
  const layout = params.get("layout");
  if (layout === "cards" || layout === "table") {
    state.layout = layout;
    state.layoutTouched = true;
  } else if (window.matchMedia("(max-width: 860px)").matches) {
    state.layout = "cards";
  }
  state.event = params.get("event") || null;
}

function writeUrl() {
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
  set("sort", state.sort, "date");
  set("dir", state.dir, "asc");
  if (state.layoutTouched) set("layout", state.layout, "table");
  else params.delete("layout");
  set("event", state.event, null);
  history.replaceState(null, "", url);
}

function syncControls() {
  const search = $("q");
  if (document.activeElement !== search && search.value !== state.q) search.value = state.q;
  $("region").value = [...$("region").options].some((option) => option.value === state.region) ? state.region : "all";
  $("status").value = [...$("status").options].some((option) => option.value === state.status) ? state.status : "all";
  $("affinity").value = [...$("affinity").options].some((option) => option.value === state.affinity) ? state.affinity : "all";
  $("sort").value = state.sort;
  $("toggle-submissions").setAttribute("aria-pressed", state.submissions ? "true" : "false");
  $("toggle-spain").setAttribute("aria-pressed", state.spain ? "true" : "false");
  $("toggle-europe").setAttribute("aria-pressed", state.region === "Europe" ? "true" : "false");
  $("toggle-soon").setAttribute("aria-pressed", state.soon ? "true" : "false");
  $("layout-table").setAttribute("aria-pressed", state.layout === "table" ? "true" : "false");
  $("layout-cards").setAttribute("aria-pressed", state.layout === "cards" ? "true" : "false");
  $("layout-switch").hidden = state.view !== "list";
}

function renderStats() {
  const open = DATA.events.filter((event) => cfpRole(event) === "open").length;
  const upcoming = DATA.events.filter((event) => cfpRole(event) === "upcoming").length;
  const attend = DATA.events.filter((event) => !isSubmissionOpportunity(event)).length;
  const spain = DATA.events.filter((event) => event.spain && isSubmissionOpportunity(event)).length;
  const soon = soonItems().length;
  const now = DATA.events.filter(isNow).length;
  const bits = [
    `<li><strong>${open}</strong> open CFPs</li>`,
    `<li><strong>${upcoming}</strong> CFP date not in file</li>`,
    `<li class="stat-soon"><strong>${soon}</strong> paper deadlines in ${SOON_DAYS} days</li>`,
    `<li class="stat-spain"><strong>${spain}</strong> in Spain on this list</li>`
  ];
  if (attend) bits.push(`<li><strong>${attend}</strong> attend-only</li>`);
  if (now) bits.unshift(`<li class="stat-now"><strong>${now}</strong> happening now</li>`);
  $("stats").innerHTML = bits.join("");
}

function renderCount() {
  const shown = filteredEvents().length;
  const pool = state.submissions
    ? DATA.events.filter(isSubmissionOpportunity).length
    : DATA.events.length;
  const hidden = DATA.events.filter((event) => !isSubmissionOpportunity(event)).length;
  const spainNote = state.spain ? " · Spain only (solo España)" : "";
  const soonNote = state.soon ? ` · paper deadlines within ${SOON_DAYS} days` : "";
  $("result-count").textContent = state.submissions
    ? `Showing ${shown} of ${pool} submission opportunities${spainNote}${soonNote}. ${hidden} attend-only ${hidden === 1 ? "meeting is" : "meetings are"} hidden.`
    : `Showing ${shown} of ${pool} events, including attend-only${spainNote}${soonNote}`;
}

function soonItems() {
  const today = todayISO();
  const items = [];
  DATA.events.forEach((event) => {
    if (cfpRole(event) !== "open") return;
    submissionEntries(event).forEach((item) => {
      if (item.date < today) return;
      const delta = daysFromToday(item.date);
      if (delta >= 0 && delta <= SOON_DAYS) items.push({ event, ...item, delta });
    });
  });
  items.sort((a, b) => a.date.localeCompare(b.date) || a.event.acronym.localeCompare(b.event.acronym));
  return items;
}

function renderNow() {
  const happening = DATA.events.filter(isNow).sort((a, b) => a.start.localeCompare(b.start));
  const rail = $("now-rail");
  if (!happening.length) {
    rail.hidden = true;
    rail.innerHTML = "";
    return;
  }
  rail.hidden = false;
  rail.innerHTML = `
    <h2 id="now-heading">Happening now · En curso</h2>
    <div class="chip-row">
      ${happening.map((event) => `
        <button type="button" class="now-chip${event.spain ? " is-spain" : ""}" data-focus="${escapeHtml(event.id)}">
          <span class="chip-when">In progress</span>
          <span class="chip-what">${escapeHtml(event.acronym)}</span>
          <span class="chip-place">${escapeHtml(event.city)}, ${escapeHtml(event.country)}</span>
          <span class="chip-date">${escapeHtml(formatRange(event.start, event.end))}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function renderSoon() {
  const items = soonItems();
  const rail = $("soon-rail");
  if (!items.length) {
    rail.classList.add("is-empty");
    rail.innerHTML = `
      <h2 id="soon-heading">Open paper deadlines · next ${SOON_DAYS} days</h2>
      <p>No paper or abstract date in the file falls inside the next ${SOON_DAYS} days. Camera-ready dates are not treated as a new submission.</p>
    `;
    return;
  }
  rail.classList.remove("is-empty");
  rail.innerHTML = `
    <h2 id="soon-heading">Open paper deadlines · next ${SOON_DAYS} days</h2>
    <p class="rail-note">${items.length} paper or abstract ${items.length === 1 ? "date is" : "dates are"} still ahead. Camera-ready is not counted. Click one to open the event.</p>
    <div class="chip-row">
      ${items.map((item) => `
        <button type="button" class="soon-chip${item.event.spain ? " is-spain" : ""}" data-focus="${escapeHtml(item.event.id)}">
          <span class="chip-when">${escapeHtml(relLabel(item.delta))}</span>
          <span class="chip-what">${escapeHtml(item.event.acronym)} · ${escapeHtml(item.label)}</span>
          <span class="chip-date">${escapeHtml(formatDay(item.date))}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function noteHtml(event) {
  if (!event.notes) return "";
  return `<p class="event-note">${escapeHtml(event.notes)}</p>`;
}

function deadlineCell(event) {
  const next = nextDeadline(event);
  if (next) {
    const delta = daysFromToday(next.date);
    const soon = delta <= SOON_DAYS;
    return `<div class="deadline-cell">${escapeHtml(next.label)} · ${escapeHtml(formatDay(next.date))}${soon ? `<span class="when">${escapeHtml(relLabel(delta))}</span>` : ""}</div>`;
  }
  if (cfpRole(event) === "upcoming") return `<div class="deadline-cell">CFP date not in this file</div>`;
  const past = lastPastDeadline(event);
  if (past) return `<div class="deadline-cell is-closed">Attend only · ${escapeHtml(past.label)} closed ${escapeHtml(formatDay(past.date))}</div>`;
  return `<div class="deadline-cell is-closed">Attend only · no paper deadline listed</div>`;
}

function emptyLead() {
  if (state.submissions && state.spain) {
    return "No Spain meeting in the file still has an open paper deadline. Turn off Submission opportunities to see attend-only events such as CNSM 2026.";
  }
  if (state.submissions) {
    return "No submission opportunities match these filters.";
  }
  return "No events match these filters.";
}

function emptyHtml() {
  const actions = state.submissions
    ? `<p><button type="button" class="btn" id="empty-show-all">Show attend-only too</button> <button type="button" class="btn btn-ghost" id="empty-clear">Clear filters</button></p>`
    : `<p><button type="button" class="btn" id="empty-clear">Clear filters</button></p>`;
  return `<div class="empty"><p>${escapeHtml(emptyLead())}</p>${actions}</div>`;
}

function bindEmptyActions() {
  const clear = $("empty-clear");
  if (clear) clear.addEventListener("click", clearFilters);
  const show = $("empty-show-all");
  if (show) {
    show.addEventListener("click", () => {
      state.submissions = false;
      writeUrl();
      render();
    });
  }
}

function renderList() {
  const events = sortedEvents();
  const root = $("view-list");
  if (!events.length) {
    root.innerHTML = emptyHtml();
    bindEmptyActions();
    return;
  }

  if (state.layout === "cards") {
    root.innerHTML = `<div class="cards">${events.map((event) => `
      <article class="card${event.spain ? " is-spain" : ""}${state.event === event.id ? " is-selected" : ""}" data-id="${escapeHtml(event.id)}" tabindex="0">
        <div class="event-acronym">${escapeHtml(event.acronym)} ${pills(event)}</div>
        <h3>${escapeHtml(event.name)}</h3>
        <p>${escapeHtml(formatRange(event.start, event.end))}</p>
        <p class="place">${escapeHtml(event.city)}, ${escapeHtml(event.country)}</p>
        <p class="region-label">${escapeHtml(event.region)} · ${escapeHtml(event.tier_note || "")}</p>
        ${noteHtml(event)}
        ${deadlineCell(event)}
        <p class="fit">${escapeHtml(event.topic_fit || "")}</p>
        <p class="links">${eventLinks(event)}</p>
      </article>
    `).join("")}</div>`;
    return;
  }

  const columns = [
    ["name", "Event"],
    ["date", "When"],
    ["country", "Where"],
    ["status", "Status"],
    ["affinity", "Affinity"],
    ["deadline", "Next deadline"]
  ];
  const head = columns.map(([key, label]) => {
    const active = state.sort === key;
    const aria = active ? (state.dir === "asc" ? "ascending" : "descending") : "none";
    const arrow = active ? (state.dir === "asc" ? " ↑" : " ↓") : "";
    return `<th scope="col" aria-sort="${aria}"><button type="button" data-sort="${key}">${label}${arrow}</button></th>`;
  }).join("") + "<th scope=\"col\">Topic fit</th>";

  const body = events.map((event) => `
    <tr data-id="${escapeHtml(event.id)}" tabindex="0" class="${event.spain ? "is-spain" : ""} ${state.event === event.id ? "is-selected" : ""}">
      <td>
        <div class="event-acronym">${escapeHtml(event.acronym)} <span class="pill ${cfpRole(event) === "closed" ? "attend" : cfpRole(event)}">${escapeHtml(cfpShort(event))}</span></div>
        <div class="event-name">${escapeHtml(event.name)}</div>
        <div class="event-tier">${escapeHtml(event.tier_note || "")}</div>
        ${noteHtml(event)}
      </td>
      <td>${escapeHtml(formatRange(event.start, event.end))}</td>
      <td>
        <div class="place">${escapeHtml(event.city)}, ${escapeHtml(event.country)}</div>
        <div class="region-label">${escapeHtml(event.region)}</div>
        <div class="pill-row">${placeMarks(event)}</div>
      </td>
      <td><span class="pill ${statusClass(event.status)}">${escapeHtml(event.status || "")}</span></td>
      <td><span class="pill ${escapeHtml(event.affinity || "neutral")}">${escapeHtml(affinityLabel(event.affinity))}</span></td>
      <td>${deadlineCell(event)}</td>
      <td><div class="fit">${escapeHtml(event.topic_fit || "")}</div><div class="links">${eventLinks(event)}</div></td>
    </tr>
  `).join("");

  root.innerHTML = `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function popupHtml(events) {
  return events.map((event) => `
    <div class="popup">
      ${event.spain ? '<span class="popup-banner">Spain · España</span>' : ""}
      <h3>${escapeHtml(event.acronym)}</h3>
      <p>${escapeHtml(event.name)}</p>
      <p>${escapeHtml(formatRange(event.start, event.end))} · ${escapeHtml(event.city)}, ${escapeHtml(event.country)}</p>
      <p>${escapeHtml(cfpShort(event))} · ${escapeHtml(affinityLabel(event.affinity))} affinity · ${escapeHtml(event.status || "")}</p>
      <p>${escapeHtml(event.topic_fit || "")}</p>
      ${event.notes ? `<p class="popup-note">${escapeHtml(event.notes)}</p>` : ""}
      <p>${eventLinks(event).replaceAll('class="', 'class="popup-link ')}</p>
      <p><button type="button" class="btn" data-open="${escapeHtml(event.id)}">Full details</button></p>
    </div>
  `).join("");
}

function renderMarkers(fit) {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  const events = sortedEvents().filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon));
  const groups = new Map();
  events.forEach((event) => {
    const key = `${event.lat.toFixed(4)},${event.lon.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });
  const placedCoords = [];

  const empty = $("map-empty");
  if (!events.length) {
    empty.hidden = false;
    empty.textContent = state.submissions
      ? "No submission opportunities with coordinates match these filters."
      : "No mapped events match these filters.";
  } else {
    empty.hidden = true;
  }

  groups.forEach((group) => {
    const spain = group.some((event) => event.spain);
    const high = group.some((event) => event.affinity === "high");
    const label = group.length === 1 ? group[0].acronym : `${group[0].city} · ${group.length}`;
    const crowded = placedCoords.some((point) => Math.abs(point.lat - group[0].lat) < 0.45 && Math.abs(point.lon - group[0].lon) < 0.45);
    placedCoords.push({ lat: group[0].lat, lon: group[0].lon });
    const icon = L.divIcon({
      className: `leaflet-div-icon pin${spain ? " pin-spain" : ""}${high ? " pin-high" : ""}`,
      html: `<span class="pin-dot"></span><span class="pin-label" style="top:${crowded ? "16px" : "-2px"}">${escapeHtml(label)}</span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    const marker = L.marker([group[0].lat, group[0].lon], {
      icon,
      title: group.map((event) => event.acronym).join(", "),
      zIndexOffset: spain ? 500 : high ? 250 : 0
    });
    marker.bindTooltip(group.map((event) => event.acronym).join(" · "), {
      direction: "top",
      offset: [0, -10]
    });
    marker.bindPopup(popupHtml(group), { maxWidth: 320 });
    markerLayer.addLayer(marker);
  });
}

function fitMap(events, maxZoom, pad = 0.25) {
  if (!map || !events.length) return;
  const bounds = L.latLngBounds(events.map((event) => [event.lat, event.lon]));
  map.invalidateSize();
  map.fitBounds(bounds.pad(pad), { maxZoom });
  syncPinLabels();
}

function scheduleFit(events, maxZoom, pad) {
  const token = ++mapFitToken;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (token !== mapFitToken || !map) return;
      fitMap(events, maxZoom, pad);
      document.getElementById("map")?.scrollIntoView({ block: "center", inline: "nearest" });
    });
  });
}

function syncPinLabels() {
  const stage = document.querySelector(".map-stage");
  if (!stage || !map) return;
  stage.classList.toggle("labels-on", map.getZoom() >= 5);
}

function ensureMap(fit) {
  const hint = $("map-hint");
  if (!window.L) {
    hint.textContent = "The map library did not load. List and timeline still work from the local JSON. Reconnect and reload to see markers.";
    $("map-empty").hidden = false;
    $("map-empty").textContent = "Map tiles and markers need Leaflet from the CDN.";
    return;
  }
  if (!map) {
    map = L.map("map", { scrollWheelZoom: false, worldCopyJump: true, minZoom: 2 });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);
    markerLayer = L.featureGroup().addTo(map);
    map.on("popupopen", (popupEvent) => {
      popupEvent.popup.getElement().querySelectorAll("[data-open]").forEach((button) => {
        button.addEventListener("click", () => openDrawer(button.getAttribute("data-open")));
      });
    });
    map.on("zoomend", syncPinLabels);
    map.setView([30, 10], 2);
  }
  renderMarkers();
  if (fit) {
    scheduleFit(sortedEvents().filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon)), 4);
  }
}

function zoomTo(events, maxZoom, pad) {
  if (!map || !events.length) return;
  scheduleFit(events, maxZoom, pad);
}

function renderTimeline() {
  const root = $("view-timeline");
  const events = sortedEvents().filter((event) => event.start);
  if (!events.length) {
    root.innerHTML = emptyHtml();
    bindEmptyActions();
    return;
  }

  const windowFrom = DATA.window.from;
  const windowTo = DATA.window.to;
  const dayWidth = 3.15;
  const cardWidth = 156;
  const origin = parseDate(windowFrom);
  const xFor = (iso) => ((parseDate(iso) - origin) / 86400000) * dayWidth;
  const span = Math.max(1, (parseDate(windowTo) - origin) / 86400000);
  const width = Math.ceil(span * dayWidth + cardWidth + 48);

  const placed = events.map((event) => ({
    event,
    x: Math.max(8, xFor(event.start)),
    w: cardWidth
  })).sort((a, b) => a.x - b.x || a.event.acronym.localeCompare(b.event.acronym));

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
  const height = 36 + laneEnds.length * lanePitch + 16;
  const months = [];
  let cursor = parseDate(windowFrom);
  const end = parseDate(windowTo);
  cursor.setDate(1);
  while (cursor <= end) {
    months.push(isoFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const years = [];
  const startYear = parseDate(windowFrom).getFullYear();
  const endYear = parseDate(windowTo).getFullYear();
  for (let year = startYear; year <= endYear; year += 1) {
    const from = year === startYear ? windowFrom : `${year}-01-01`;
    const to = year === endYear ? windowTo : `${year + 1}-01-01`;
    years.push({ year, x: xFor(from), w: Math.max(0, xFor(to) - xFor(from)) });
  }

  const today = todayISO();
  const showToday = today >= windowFrom && today <= windowTo;

  root.innerHTML = `
    <p class="timeline-help">Scroll sideways across ${escapeHtml(formatMonthYear(windowFrom))} – ${escapeHtml(formatMonthYear(windowTo))}. Amber cards are hosted in Spain. The top edge shows affinity.</p>
    <div class="timeline-scroll" id="timeline-scroll">
      <div class="timeline-canvas" style="width:${width}px;height:${height}px">
        ${years.map((year, index) => `<div class="year-band${index % 2 ? " alt" : ""}" style="left:${year.x}px;width:${year.w}px"></div>`).join("")}
        ${months.map((iso) => {
          const date = parseDate(iso);
          const label = date.getMonth() === 0 || iso === months[0] ? `${MONTHS[date.getMonth()]} ${date.getFullYear()}` : MONTHS[date.getMonth()];
          const x = xFor(iso);
          return `<div class="month-line" style="left:${x}px"></div><div class="month-label" style="left:${x + 6}px">${label}</div>`;
        }).join("")}
        ${showToday ? `<div class="today-line" style="left:${xFor(today)}px"><span>Today</span></div>` : ""}
        ${placed.map((item) => `
          <button type="button" class="t-card is-${escapeHtml(item.event.affinity || "low")}${item.event.spain ? " is-spain" : ""} affinity-${escapeHtml(item.event.affinity || "low")}${state.event === item.event.id ? " is-selected" : ""}" data-id="${escapeHtml(item.event.id)}" style="left:${item.x}px;top:${36 + item.lane * lanePitch}px" title="${escapeHtml(item.event.notes || item.event.name)}">
            <span class="t-date">${escapeHtml(formatRange(item.event.start, item.event.end))}</span>
            <span class="t-acronym">${escapeHtml(item.event.acronym)}</span>
            <span class="t-place">${escapeHtml(item.event.city)}${item.event.spain ? " · España" : ""}</span>
            <span class="t-meta">${escapeHtml([cfpShort(item.event), item.event.status !== "Confirmed" ? item.event.status : "", item.event.notes ? "Note" : ""].filter(Boolean).join(" · "))}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderWatching() {
  const items = DATA.watching || [];
  $("watching").innerHTML = `
    <h2 id="watching-heading">Still watching</h2>
    <p class="intro">CFP not open yet. These series have no dated edition in the file, so they are not on the map or timeline. Cities and deadlines stay out until a primary announcement exists.</p>
    <div class="watch-grid">
      ${items.map((item) => `
        <article class="watch-card">
          <h3>${escapeHtml(item.series)} ${isHighSeries(item.series) ? '<span class="pill high">High affinity</span>' : ""}${(DATA.user_venues || []).some((venue) => venue.toLowerCase() === String(item.series).toLowerCase()) ? '<span class="pill own">Own venue</span>' : ""}</h3>
          <p>${escapeHtml(item.note || "")}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function renderAbout() {
  const owner = DATA.owner || {};
  const scholar = safeUrl(owner.scholar);
  const authors = DATA.affinity_authors || [];
  const venues = DATA.user_venues || [];
  $("kicker").textContent = `${owner.name || "Research group"} · UPM · wireless access and end-to-end performance`;
  if (scholar) $("scholar-link").href = scholar;
  $("verified").textContent = DATA.verified_as_of ? `Verified ${formatDay(DATA.verified_as_of)}` : "Verification date not listed";
  $("lede").textContent = `Default view: where a paper can still be submitted, or the CFP date is not in the file yet. ${formatMonthYear(DATA.window.from)} – ${formatMonthYear(DATA.window.to)}. Spain events are marked España.`;
  $("about").innerHTML = `
    <h2 id="about-heading">About this list</h2>
    <p class="intro">A planning board for ${escapeHtml(owner.name || "the group")} at Universidad Politécnica de Madrid (UPM). It prioritizes venues where the group can still submit. The calendar only shows records in <a href="data/conferences.json">data/conferences.json</a>.</p>
    <div class="about-grid">
      <div class="about-card">
        <h3>Focus</h3>
        <p>${escapeHtml(DATA.focus || "")}</p>
        <p>That includes crowdsourced cellular measurement, CBRS spectrum sharing, and Starlink direct-to-cell (DTC).</p>
        <p>${scholar ? `<a href="${scholar}">Google Scholar</a>` : ""}</p>
      </div>
      <div class="about-card">
        <h3>Own venues</h3>
        <p>Series where this researcher has published. Matching rows carry an Own venue badge.</p>
        <ul>${venues.map((venue) => `<li>${escapeHtml(venue)}</li>`).join("")}</ul>
      </div>
      <div class="about-card">
        <h3>Affinity authors</h3>
        <p>Authors often cited alongside this measurement work.</p>
        <ul>${authors.map((author) => `<li>${escapeHtml(author)}</li>`).join("")}</ul>
      </div>
      <div class="about-card">
        <h3>Submission opportunities</h3>
        <p>The default list keeps two kinds of dated events: a paper or abstract deadline that is still ahead, and an edition whose CFP date is not in the file. Nothing here invents a deadline.</p>
        <p>Meetings whose paper deadline has passed, or that only have camera-ready left, are marked attend-only and stay hidden until Submission opportunities is turned off. ICC and GLOBECOM stay in the pool: wireless networks and measurements are in their topics.</p>
      </div>
      <div class="about-card">
        <h3>High-affinity series</h3>
        <p>Each edition in the file also has its own affinity field. A series can be high affinity and still sit under Still watching until dates are announced.</p>
        <div class="series-list">${HIGH_SERIES.map((series) => `<span class="pill high">${escapeHtml(series)}</span>`).join("")}</div>
      </div>
    </div>
  `;
  $("footer-note").innerHTML = `Dates, cities, and deadlines are copied from <a href="https://github.com/JG-Head/wireless-measurement-conferences/blob/main/data/conferences.json">data/conferences.json</a>${DATA.verified_as_of ? ` (verified ${escapeHtml(formatDay(DATA.verified_as_of))})` : ""}. Check the official site before submitting. This page does not add venues.`;
}

function fillSelect(id, values, labels) {
  const select = $(id);
  const current = [...select.options].map((option) => option.value);
  values.forEach((value) => {
    if (current.includes(value)) return;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labels ? labels(value) : value;
    select.appendChild(option);
  });
}

function populateFilters() {
  const regions = [...new Set(DATA.events.map((event) => event.region).filter(Boolean))];
  const preferred = ["Europe", "North America", "Americas", "South America", "Asia", "Middle East"];
  regions.sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  fillSelect("region", regions);
  const statuses = [...new Set(DATA.events.map((event) => event.status).filter(Boolean))];
  statuses.sort((a, b) => (STATUS_RANK[a] ?? 9) - (STATUS_RANK[b] ?? 9) || a.localeCompare(b));
  fillSelect("status", statuses);
  const affinities = [...new Set(DATA.events.map((event) => event.affinity).filter(Boolean))];
  affinities.sort((a, b) => (AFFINITY_RANK[a] ?? 9) - (AFFINITY_RANK[b] ?? 9));
  fillSelect("affinity", affinities, affinityLabel);
}

function optionExists(id, value) {
  return value === "all" || [...$(id).options].some((option) => option.value === value);
}

function coerceFilters() {
  if (!optionExists("region", state.region)) state.region = "all";
  if (!optionExists("status", state.status)) state.status = "all";
  if (!optionExists("affinity", state.affinity)) state.affinity = "all";
  if (state.event && !findEvent(state.event)) state.event = null;
}

function applyView() {
  VIEWS.forEach((view) => {
    const on = state.view === view;
    $("view-" + view).hidden = !on;
    const tab = $("tab-" + view);
    tab.setAttribute("aria-selected", on ? "true" : "false");
    tab.tabIndex = on ? 0 : -1;
  });
  if (state.view === "list") renderList();
  if (state.view === "map") ensureMap(true);
  if (state.view === "timeline") renderTimeline();
}

function render() {
  syncControls();
  renderStats();
  renderCount();
  renderNow();
  renderSoon();
  applyView();
}

function clearFilters() {
  state.q = "";
  state.spain = false;
  state.region = "all";
  state.status = "all";
  state.affinity = "all";
  state.soon = false;
  state.submissions = true;
  writeUrl();
  render();
}

function setView(view) {
  if (!VIEWS.includes(view)) return;
  state.view = view;
  writeUrl();
  render();
}

function findEvent(id) {
  return DATA.events.find((event) => event.id === id) || null;
}

function drawerHtml(event) {
  const today = todayISO();
  const deadlines = deadlineEntries(event);
  const deadlineList = deadlines.length ? `<ul class="deadlines">${deadlines.map((item) => {
    const delta = daysFromToday(item.date);
    const past = item.date < today;
    const soon = !past && delta <= SOON_DAYS;
    const cls = past ? "is-past" : soon ? "is-soon" : "";
    return `<li class="${cls}"><span>${escapeHtml(item.label)}</span><span>${escapeHtml(formatDay(item.date))}</span><span class="rel">${escapeHtml(past ? `Passed · ${relLabel(delta)}` : relLabel(delta))}</span></li>`;
  }).join("")}</ul>` : `<p class="region-label">No deadlines listed in the data file.</p>`;

  return `
    <h2 id="drawer-title">${escapeHtml(event.acronym)}</h2>
    <p class="drawer-name">${escapeHtml(event.name)}</p>
    <div class="pill-row">${pills(event)}</div>
    <dl class="meta-grid">
      <dt>When</dt><dd>${escapeHtml(formatRange(event.start, event.end))}</dd>
      <dt>Where</dt><dd>${escapeHtml(event.city)}, ${escapeHtml(event.country)}${event.spain ? " · España" : ""}</dd>
      <dt>Region</dt><dd>${escapeHtml(event.region || "")}</dd>
      <dt>Series</dt><dd>${escapeHtml(event.series || "")}</dd>
      <dt>Standing</dt><dd>${escapeHtml(event.standing || "")}</dd>
      <dt>Tier</dt><dd>${escapeHtml(event.tier_note || "")}</dd>
    </dl>
    <p>${escapeHtml(event.topic_fit || "")}</p>
    <p>${escapeHtml(cfpBlurb(event))}</p>
    ${event.notes ? `<aside class="note"><strong>Note from the data file</strong><p>${escapeHtml(event.notes)}</p></aside>` : ""}
    <h3>Deadlines</h3>
    ${deadlineList}
    <div class="drawer-actions">
      ${Number.isFinite(event.lat) ? `<button type="button" class="btn" id="drawer-map">Show on map</button>` : ""}
    </div>
    <p class="drawer-links">${eventLinks(event)}</p>
  `;
}

function openDrawer(id) {
  const event = findEvent(id);
  if (!event) return;
  lastFocus = document.activeElement;
  state.event = id;
  writeUrl();
  $("drawer-kicker").textContent = event.series || "Event";
  $("drawer-body").innerHTML = drawerHtml(event);
  $("backdrop").hidden = false;
  $("drawer").hidden = false;
  document.body.style.overflow = "hidden";
  const mapButton = $("drawer-map");
  if (mapButton) {
    mapButton.addEventListener("click", () => {
      closeDrawer(false);
      setView("map");
      requestAnimationFrame(() => zoomTo([event], 8));
    });
  }
  $("drawer-close").focus();
  document.querySelectorAll("[data-id]").forEach((node) => {
    node.classList.toggle("is-selected", node.getAttribute("data-id") === id);
  });
}

function closeDrawer(restoreFocus) {
  state.event = null;
  writeUrl();
  $("backdrop").hidden = true;
  $("drawer").hidden = true;
  document.body.style.overflow = "";
  document.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  if (restoreFocus !== false && lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

function focusEvent(id) {
  openDrawer(id);
  if (state.view === "map" && map) {
    const event = findEvent(id);
    if (event && Number.isFinite(event.lat)) map.setView([event.lat, event.lon], 5);
  }
  if (state.view === "timeline") {
    const card = document.querySelector(`#view-timeline [data-id="${CSS.escape(id)}"]`);
    if (card) card.scrollIntoView({ inline: "center", block: "nearest" });
  }
}

function onListClick(event) {
  const sortButton = event.target.closest("[data-sort]");
  if (sortButton) {
    const key = sortButton.getAttribute("data-sort");
    if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
    else {
      state.sort = key;
      state.dir = "asc";
    }
    writeUrl();
    render();
    return;
  }
  if (event.target.closest("a")) return;
  const row = event.target.closest("[data-id]");
  if (row) openDrawer(row.getAttribute("data-id"));
}

function onListKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("[data-id]");
  if (!row || event.target.closest("a, button")) return;
  event.preventDefault();
  openDrawer(row.getAttribute("data-id"));
}

function bind() {
  $("filters").addEventListener("submit", (event) => event.preventDefault());
  $("q").addEventListener("input", () => {
    state.q = $("q").value;
    writeUrl();
    render();
  });
  $("toggle-submissions").addEventListener("click", () => {
    state.submissions = !state.submissions;
    writeUrl();
    render();
  });
  $("toggle-spain").addEventListener("click", () => {
    state.spain = !state.spain;
    writeUrl();
    render();
  });
  $("toggle-europe").addEventListener("click", () => {
    state.region = state.region === "Europe" ? "all" : "Europe";
    writeUrl();
    render();
  });
  $("toggle-soon").addEventListener("click", () => {
    state.soon = !state.soon;
    writeUrl();
    render();
  });
  ["region", "status", "affinity", "sort"].forEach((id) => {
    $(id).addEventListener("change", () => {
      if (id === "sort" && state.sort !== $(id).value) state.dir = "asc";
      state[id] = $(id).value;
      writeUrl();
      render();
    });
  });
  $("clear-filters").addEventListener("click", clearFilters);
  $("layout-table").addEventListener("click", () => {
    state.layout = "table";
    state.layoutTouched = true;
    writeUrl();
    render();
  });
  $("layout-cards").addEventListener("click", () => {
    state.layout = "cards";
    state.layoutTouched = true;
    writeUrl();
    render();
  });
  $("view-list").addEventListener("click", onListClick);
  $("view-list").addEventListener("keydown", onListKeydown);
  $("view-timeline").addEventListener("click", (event) => {
    const card = event.target.closest("[data-id]");
    if (card) openDrawer(card.getAttribute("data-id"));
  });
  document.body.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-focus]");
    if (chip) focusEvent(chip.getAttribute("data-focus"));
  });
  $("view-switch").addEventListener("click", (event) => {
    const tab = event.target.closest("[role='tab']");
    if (!tab) return;
    setView(tab.id.replace("tab-", ""));
  });
  $("view-switch").addEventListener("keydown", (event) => {
    const index = VIEWS.indexOf(state.view);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setView(VIEWS[(index + 1) % VIEWS.length]);
      $("tab-" + state.view).focus();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setView(VIEWS[(index + VIEWS.length - 1) % VIEWS.length]);
      $("tab-" + state.view).focus();
    }
  });
  $("zoom-spain").addEventListener("click", () => {
    const events = sortedEvents().filter((event) => event.spain && Number.isFinite(event.lat));
    if (!events.length) {
      $("map-empty").hidden = false;
      $("map-empty").textContent = state.submissions
        ? "No Spain submission opportunity matches these filters."
        : "No Spain events match these filters.";
      return;
    }
    zoomTo(events, 10, 0.06);
  });
  $("zoom-all").addEventListener("click", () => {
    renderMarkers();
    zoomTo(sortedEvents().filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon)), 4);
  });
  $("drawer-close").addEventListener("click", () => closeDrawer());
  $("backdrop").addEventListener("click", () => closeDrawer());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("drawer").hidden) closeDrawer();
  });
  window.matchMedia("(max-width: 860px)").addEventListener("change", (media) => {
    if (state.layoutTouched) return;
    state.layout = media.matches ? "cards" : "table";
    if (state.view === "list") renderList();
    syncControls();
  });
}

function showFatal(message) {
  $("verified").textContent = "Could not load conference data";
  $("result-count").textContent = message;
  $("view-list").innerHTML = `<div class="empty"><p>${escapeHtml(message)}</p><p>Serve this folder over HTTP so <code>data/conferences.json</code> can load. From the repo: <code>python3 -m http.server -d docs 8080</code></p></div>`;
}

async function init() {
  readUrl();
  bind();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    DATA = await response.json();
    if (!Array.isArray(DATA.events)) throw new Error("events array missing");
  } catch (err) {
    showFatal(`Conference data failed to load (${err.message}).`);
    return;
  }
  populateFilters();
  coerceFilters();
  writeUrl();
  renderAbout();
  renderWatching();
  render();
  if (state.event && findEvent(state.event)) openDrawer(state.event);
}

init();
