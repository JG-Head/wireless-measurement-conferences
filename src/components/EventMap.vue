<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import { useDash } from "../composables/useDashboard";
import { affinityLabel, cfpShort, formatRange } from "../lib/model";

const props = defineProps({
  active: { type: Boolean, default: false }
});

const dash = useDash();
const stage = ref(null);
const mapEl = ref(null);
const emptyText = ref("");
const hint = ref("City coordinates come from the data file. Click a marker for details. Shared cities use one marker.");

let map = null;
let markerLayer = null;
let fitToken = 0;
let resizeObserver = null;
let lastWidth = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mappedEvents() {
  return dash.sorted.filter((event) => Number.isFinite(event.lat) && Number.isFinite(event.lon));
}

function popupHtml(events) {
  return events.map((event) => {
    const site = dash.safeUrl(event.site);
    const cfp = dash.safeUrl(event.cfp);
    const links = [];
    if (site) links.push(`<a class="popup-link" href="${site}" target="_blank" rel="noopener noreferrer">Official site</a>`);
    if (cfp && cfp !== site) links.push(`<a class="popup-link" href="${cfp}" target="_blank" rel="noopener noreferrer">Call for papers</a>`);
    const org = event.organizer
      ? `<span class="pill org org-${event.organizer === "ACM" ? "acm" : event.organizer === "Other" ? "other" : "ieee"}">${escapeHtml(event.organizer)}</span> `
      : "";
    return `
      <div class="popup">
        ${event.spain ? '<span class="popup-banner">Spain · España</span>' : ""}
        <h3>${escapeHtml(event.acronym)}</h3>
        <p>${escapeHtml(event.name)}</p>
        <p>${escapeHtml(formatRange(event.start, event.end))} · ${escapeHtml(event.city)}, ${escapeHtml(event.country)}</p>
        <p>${org}${escapeHtml(cfpShort(event, dash.today))} · ${escapeHtml(affinityLabel(event.affinity))} affinity · ${escapeHtml(event.status || "")}</p>
        <p>${escapeHtml(event.topic_fit || "")}</p>
        ${event.notes ? `<p class="popup-note">${escapeHtml(event.notes)}</p>` : ""}
        <p>${links.join(" ")}</p>
        <p><button type="button" class="btn btn-accent" data-open="${escapeHtml(event.id)}">Full details</button></p>
      </div>`;
  }).join("");
}

function syncPinLabels() {
  if (!stage.value || !map) return;
  stage.value.classList.toggle("labels-on", map.getZoom() >= 5);
}

function renderMarkers() {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  const events = mappedEvents();
  if (!events.length) {
    emptyText.value = dash.state.submissions
      ? "No submission opportunities with coordinates match these filters."
      : "No mapped events match these filters.";
  } else {
    emptyText.value = "";
  }
  const groups = new Map();
  events.forEach((event) => {
    const key = `${event.lat.toFixed(4)},${event.lon.toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  });
  const placed = [];
  groups.forEach((group) => {
    const spain = group.some((event) => event.spain);
    const high = group.some((event) => event.affinity === "high");
    const label = group.length === 1 ? group[0].acronym : `${group[0].city} · ${group.length}`;
    const crowded = placed.some((point) => Math.abs(point.lat - group[0].lat) < 0.45 && Math.abs(point.lon - group[0].lon) < 0.45);
    placed.push({ lat: group[0].lat, lon: group[0].lon });
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
    marker.bindTooltip(group.map((event) => event.acronym).join(" · "), { direction: "top", offset: [0, -10] });
    marker.bindPopup(popupHtml(group), { maxWidth: 280, autoPanPadding: [32, 32], keepInView: true });
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
  const token = ++fitToken;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (token !== fitToken || !map) return;
      fitMap(events, maxZoom, pad);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      mapEl.value?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
}

function ensureMap() {
  if (map || !mapEl.value) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  map = L.map(mapEl.value, {
    scrollWheelZoom: false,
    worldCopyJump: true,
    minZoom: 2,
    zoomAnimation: !reduceMotion,
    fadeAnimation: !reduceMotion,
    markerZoomAnimation: !reduceMotion
  });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);
  markerLayer = L.featureGroup().addTo(map);
  map.on("popupopen", (popupEvent) => {
    const popupEl = popupEvent.popup.getElement();
    const marker = popupEvent.popup._source;
    const icon = marker && marker.getElement();
    if (icon) icon.tabIndex = -1;
    popupEl.querySelectorAll("[data-open]").forEach((button) => {
      button.addEventListener("click", () => dash.openEvent(button.getAttribute("data-open"), icon || button));
    });
  });
  map.on("zoomend", syncPinLabels);
  map.setView([30, 10], 2);
  if (stage.value && typeof ResizeObserver !== "undefined") {
    lastWidth = stage.value.clientWidth;
    resizeObserver = new ResizeObserver(() => {
      const width = stage.value.clientWidth;
      if (!map || width === lastWidth) return;
      lastWidth = width;
      map.invalidateSize();
    });
    resizeObserver.observe(stage.value);
  }
}

function showAndFit() {
  ensureMap();
  if (!map) return;
  renderMarkers();
  map.invalidateSize();
  scheduleFit(mappedEvents(), 4);
}

function zoomSpain() {
  const events = mappedEvents().filter((event) => event.spain);
  if (!events.length) {
    emptyText.value = dash.state.submissions
      ? "No Spain submission opportunity matches these filters."
      : "No Spain events match these filters.";
    return;
  }
  emptyText.value = "";
  scheduleFit(events, 10, 0.06);
}

function zoomAll() {
  renderMarkers();
  const events = mappedEvents();
  if (!events.length) {
    emptyText.value = "No visible markers to fit.";
    return;
  }
  scheduleFit(events, 4);
}

function zoomTo(events, maxZoom) {
  ensureMap();
  if (!map) return;
  renderMarkers();
  scheduleFit(events, maxZoom, maxZoom >= 8 ? 0.2 : 0.25);
}

watch(() => props.active, (active) => {
  if (active) nextTick(showAndFit);
});

watch(() => dash.sorted.map((event) => event.id).join(","), () => {
  if (props.active) {
    renderMarkers();
    scheduleFit(mappedEvents(), 4);
  }
});

onMounted(() => {
  if (props.active) nextTick(showAndFit);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map?.remove();
  map = null;
});

defineExpose({ zoomTo, zoomAll });
</script>

<template>
  <section id="view-map" role="tabpanel" aria-labelledby="tab-map">
    <div ref="stage" class="map-stage">
      <div id="map" ref="mapEl" role="region" aria-label="Event map"></div>
    </div>
    <div class="map-footer">
      <div class="map-tools">
        <button type="button" class="btn btn-map" @click="zoomSpain">Zoom to Spain</button>
        <button type="button" class="btn btn-map" aria-label="Reset map to fit all visible markers" @click="zoomAll">Reset view</button>
      </div>
      <ul class="legend" aria-label="Map legend">
        <li><i class="swatch swatch-spain" aria-hidden="true"></i> Spain · España</li>
        <li><i class="swatch swatch-other" aria-hidden="true"></i> Other city</li>
        <li><i class="swatch swatch-high" aria-hidden="true"></i> High affinity ring</li>
      </ul>
      <p class="map-hint">{{ hint }}</p>
    </div>
    <p v-if="emptyText" class="empty map-empty">{{ emptyText }}</p>
  </section>
</template>
