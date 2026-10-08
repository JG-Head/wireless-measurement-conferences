<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useDash } from "./composables/useDashboard";
import AppSidebar from "./components/AppSidebar.vue";
import EventList from "./components/EventList.vue";
import EventMap from "./components/EventMap.vue";
import EventTimeline from "./components/EventTimeline.vue";
import EventDrawer from "./components/EventDrawer.vue";
import DeadlineRails from "./components/DeadlineRails.vue";
import WatchingPanel from "./components/WatchingPanel.vue";
import AboutPanel from "./components/AboutPanel.vue";

const dash = useDash();
const navOpen = ref(false);
const mapAlive = ref(dash.state.view === "map");
const mapRef = ref(null);
const viewTitle = computed(() => (
  dash.state.view === "map" ? "Map" : dash.state.view === "timeline" ? "Timeline" : "Submission list"
));
const nextItem = computed(() => dash.soon[0] || null);

watch(() => dash.state.view, (view) => {
  if (view === "map") mapAlive.value = true;
  navOpen.value = false;
});

function showOnMap(event) {
  dash.closeEvent(false);
  dash.setView("map");
  requestAnimationFrame(() => mapRef.value?.zoomTo([event], 8));
}

onMounted(() => {
  const media = window.matchMedia("(max-width: 860px)");
  media.addEventListener("change", (change) => {
    if (dash.state.layoutTouched) return;
    dash.state.layout = change.matches ? "cards" : "table";
  });
});
</script>

<template>
  <a class="skip" href="#view-root">Skip to events</a>
  <div class="app-frame">
    <header class="mast">
      <div class="mast-bar"></div>
      <div class="mast-body">
        <p class="school">Escuela Técnica Superior de Ingenieros de Telecomunicación · Universidad Politécnica de Madrid</p>
        <h1>Wireless measurement conferences</h1>
        <p class="mast-sub">Wireless access and end-to-end performance<span v-if="dash.windowLabel"> · {{ dash.windowLabel }}</span></p>
      </div>
    </header>
    <button type="button" class="nav-toggle" :aria-expanded="navOpen" aria-controls="app-sidebar" @click="navOpen = true">
      <i class="bi bi-list" aria-hidden="true"></i>
      <span>Filters</span>
    </button>
    <div v-if="navOpen" class="nav-scrim" @click="navOpen = false"></div>
    <aside id="app-sidebar" class="sidebar" :class="{ 'is-open': navOpen }">
      <button type="button" class="nav-close" @click="navOpen = false">Close</button>
      <AppSidebar />
    </aside>
    <div class="workspace">
      <h2 class="section-title">{{ viewTitle }}</h2>
      <ul class="kpis" aria-label="Summary">
        <li v-if="nextItem" class="kpi" :class="{ 'is-urgent': nextItem.delta <= 30 }">
          <span class="kpi-num">{{ nextItem.delta }}<span class="kpi-arrow" aria-hidden="true"></span></span>
          <span class="kpi-label">days to {{ nextItem.event.acronym }} {{ nextItem.label.toLowerCase() }}</span>
        </li>
        <li v-for="item in dash.stats" :key="item.key" class="kpi">
          <span class="kpi-num">{{ item.text.split(' ')[0] }}</span>
          <span class="kpi-label">{{ item.text.slice(item.text.indexOf(' ') + 1) }}</span>
        </li>
      </ul>
      <p class="takeaway" aria-live="polite">{{ dash.countText }}</p>
      <div v-if="dash.state.view === 'list'" class="result-bar">
        <div class="layout-switch" role="group" aria-label="List layout">
          <button type="button" :aria-pressed="dash.state.layout === 'table'" @click="dash.patch({ layout: 'table', layoutTouched: true })">Table</button>
          <button type="button" :aria-pressed="dash.state.layout === 'cards'" @click="dash.patch({ layout: 'cards', layoutTouched: true })">Cards</button>
        </div>
      </div>
      <DeadlineRails />
      <div id="view-root">
        <EventList v-show="dash.state.view === 'list'" />
        <EventMap v-if="mapAlive" v-show="dash.state.view === 'map'" ref="mapRef" :active="dash.state.view === 'map'" />
        <EventTimeline v-show="dash.state.view === 'timeline'" />
      </div>
      <WatchingPanel />
      <AboutPanel />
      <footer class="site-footer">
        <p class="footer-label">{{ viewTitle }}</p>
        <p class="footer-meta">
          Dates, cities, and deadlines are copied from
          <a href="https://github.com/JG-Head/wireless-measurement-conferences/blob/main/data/conferences.json">data/conferences.json</a>
          <template v-if="dash.data.verified_as_of"> (verified {{ dash.formatDay(dash.data.verified_as_of) }})</template>.
          Check the official site before submitting. This page does not add venues.
        </p>
        <p class="footer-meta">Figtree, SIL Open Font License. Map tiles © OpenStreetMap contributors. Built with Vue, Vite, and Bootstrap.</p>
      </footer>
    </div>
  </div>
  <EventDrawer @show-map="showOnMap" />
</template>
