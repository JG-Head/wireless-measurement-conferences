<script setup>
import { onMounted, ref, watch } from "vue";
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
  <div class="app-shell">
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
      <header class="page-head">
        <p class="kicker">Wireless access and end-to-end performance</p>
        <p class="page-title">{{ dash.state.view === 'map' ? 'Map' : dash.state.view === 'timeline' ? 'Timeline' : 'Submission list' }}</p>
      </header>
      <ul class="stats" aria-label="Summary">
        <li v-for="item in dash.stats" :key="item.key" :class="`stat-${item.key}`"><strong>{{ item.text.split(' ')[0] }}</strong> {{ item.text.slice(item.text.indexOf(' ') + 1) }}</li>
      </ul>
      <div class="result-bar">
        <p class="result-count" aria-live="polite">{{ dash.countText }}</p>
        <div v-if="dash.state.view === 'list'" class="layout-switch" role="group" aria-label="List layout">
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
        <p>
          Dates, cities, and deadlines are copied from
          <a href="https://github.com/JG-Head/wireless-measurement-conferences/blob/main/data/conferences.json">data/conferences.json</a>
          <template v-if="dash.data.verified_as_of"> (verified {{ dash.formatDay(dash.data.verified_as_of) }})</template>.
          Check the official site before submitting. This page does not add venues.
        </p>
        <p class="colophon">Type: Newsreader and Figtree, SIL Open Font License. Map tiles © OpenStreetMap contributors. Built with Vue, Vite, and Bootstrap.</p>
      </footer>
    </div>
  </div>
  <EventDrawer @show-map="showOnMap" />
</template>
