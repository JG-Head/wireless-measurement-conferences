import { computed, inject, provide, reactive } from "vue";
import {
  ORGANIZERS,
  VIEWS,
  cfpRole,
  emptyLead,
  eventLabs,
  filterEvents,
  formatDay,
  formatMonthYear,
  happeningNow,
  isNow,
  isSubmissionOpportunity,
  labById,
  labUnits,
  resultText,
  safeUrl,
  soonItems,
  sortEvents,
  sortedAffinities,
  sortedRegions,
  sortedStatuses,
  todayISO,
  watchingIntro,
  watchingItems,
  writeFilters
} from "../lib/model";

export const dashboardKey = Symbol("dashboard");

export function provideDashboard(dashboard) {
  provide(dashboardKey, dashboard);
}

export function useDash() {
  return inject(dashboardKey);
}

export function createDashboard(data, labs, initial = {}) {
  const state = reactive({
    view: "list",
    q: "",
    spain: false,
    region: "all",
    status: "all",
    affinity: "all",
    soon: false,
    submissions: true,
    organizers: [],
    labs: [],
    sort: "date",
    dir: "asc",
    layout: "table",
    layoutTouched: false,
    event: null,
    ...initial
  });

  let lastFocus = null;
  let syncing = false;

  function persist() {
    if (syncing) return;
    writeFilters(state);
  }

  function applyFilters(next) {
    syncing = true;
    Object.assign(state, next);
    syncing = false;
  }

  const today = todayISO();
  const events = data.events || [];
  const regions = sortedRegions(events);
  const statuses = sortedStatuses(events);
  const affinities = sortedAffinities(events);

  if (!regions.includes(state.region) && state.region !== "all") state.region = "all";
  if (!statuses.includes(state.status) && state.status !== "all") state.status = "all";
  if (!affinities.includes(state.affinity) && state.affinity !== "all") state.affinity = "all";
  const knownLabs = new Set(labUnits(labs).map((unit) => unit.id));
  state.labs = state.labs.filter((id) => knownLabs.has(id));
  if (state.event && !events.some((event) => event.id === state.event)) state.event = null;

  const sorted = computed(() => sortEvents(filterEvents(events, state, labs, today), state, today));
  const soon = computed(() => soonItems(events, state, today));
  const now = computed(() => happeningNow(events, state, today));
  const watching = computed(() => watchingItems(data, state, labs));
  const selected = computed(() => events.find((event) => event.id === state.event) || null);
  const countText = computed(() => resultText(sorted.value.length, data, state, labs, today));
  const emptyMessage = computed(() => emptyLead(state, data, labs));
  const watchIntro = computed(() => watchingIntro(watching.value, state));

  const stats = computed(() => {
    const open = events.filter((event) => cfpRole(event, today) === "open").length;
    const upcoming = events.filter((event) => cfpRole(event, today) === "upcoming").length;
    const attend = events.filter((event) => !isSubmissionOpportunity(event, today)).length;
    const spain = events.filter((event) => event.spain && isSubmissionOpportunity(event, today)).length;
    const items = [];
    const happening = events.filter((event) => isNow(event, today)).length;
    if (happening) items.push({ key: "now", text: `${happening} happening now` });
    items.push({ key: "open", text: `${open} open CFPs` });
    items.push({ key: "upcoming", text: `${upcoming} CFP date not in file` });
    items.push({ key: "soon", text: `${soon.value.length} paper deadlines in 90 days` });
    items.push({ key: "spain", text: `${spain} in Spain on this list` });
    if (attend) items.push({ key: "attend", text: `${attend} attend-only` });
    return items;
  });

  function toggleOrganizer(name) {
    const selectedNames = new Set(state.organizers);
    if (selectedNames.has(name)) selectedNames.delete(name);
    else selectedNames.add(name);
    state.organizers = ORGANIZERS.filter((item) => selectedNames.has(item));
    persist();
  }

  function toggleLab(id) {
    const selectedIds = new Set(state.labs);
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    state.labs = labUnits(labs).map((unit) => unit.id).filter((unitId) => selectedIds.has(unitId));
    persist();
  }

  function clearFilters() {
    state.q = "";
    state.spain = false;
    state.region = "all";
    state.status = "all";
    state.affinity = "all";
    state.soon = false;
    state.submissions = true;
    state.organizers = [];
    state.labs = [];
    persist();
  }

  function setView(view) {
    if (!VIEWS.includes(view)) return;
    state.view = view;
    persist();
  }

  function setSort(key) {
    if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
    else {
      state.sort = key;
      state.dir = "asc";
    }
    persist();
  }

  function openEvent(id, opener) {
    if (!events.some((event) => event.id === id)) return;
    lastFocus = opener || document.activeElement;
    state.event = id;
    persist();
  }

  function closeEvent(restoreFocus = true) {
    const id = state.event;
    state.event = null;
    persist();
    if (!restoreFocus) return;
    const target = lastFocus && lastFocus.isConnected
      ? lastFocus
      : document.querySelector(`[data-id="${CSS.escape(id || "")}"]`);
    if (target && typeof target.focus === "function") target.focus();
  }

  function patch(partial) {
    Object.assign(state, partial);
    persist();
  }

  const dashboard = reactive({
    state,
    data,
    labs,
    today,
    regions,
    statuses,
    affinities,
    sorted,
    soon,
    now,
    watching,
    selected,
    countText,
    emptyMessage,
    watchIntro,
    stats,
    units: labUnits(labs),
    coreLabs: labUnits(labs).filter((unit) => unit.tier === "core"),
    secondaryLabs: labUnits(labs).filter((unit) => unit.tier === "secondary"),
    toggleOrganizer,
    toggleLab,
    clearFilters,
    setView,
    setSort,
    openEvent,
    closeEvent,
    patch,
    applyFilters,
    persist,
    labById: (id) => labById(labs, id),
    eventLabs: (event) => eventLabs(event, labs),
    formatDay,
    formatMonthYear,
    safeUrl,
    ownerName: data.owner?.name || "Research group",
    scholar: safeUrl(data.owner?.scholar),
    verifiedLabel: data.verified_as_of ? `Verified ${formatDay(data.verified_as_of)}` : "Verification date not listed",
    windowLabel: data.window ? `${formatMonthYear(data.window.from)} – ${formatMonthYear(data.window.to)}` : ""
  });
  persist();
  return dashboard;
}
