<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useDash } from "../composables/useDashboard";
import { cfpBlurb, daysFromToday, deadlineEntries, formatRange, relLabel, SOON_DAYS } from "../lib/model";
import EventPills from "./EventPills.vue";

const emit = defineEmits(["show-map"]);
const dash = useDash();
const drawer = ref(null);
const closeButton = ref(null);

function rows(event) {
  return deadlineEntries(event).map((item) => {
    const delta = daysFromToday(item.date, dash.today);
    const past = item.date < dash.today;
    return { ...item, delta, past, soon: !past && delta <= SOON_DAYS };
  });
}

function onKey(event) {
  if (!dash.selected || !drawer.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    dash.closeEvent();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...drawer.value.querySelectorAll("a[href], button:not([disabled])")];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

watch(() => dash.selected?.id, async (id) => {
  document.body.style.overflow = id ? "hidden" : "";
  if (!id) return;
  await nextTick();
  closeButton.value?.focus();
});

onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>

<template>
  <div v-if="dash.selected" class="backdrop" @click="dash.closeEvent()"></div>
  <aside
    v-if="dash.selected"
    id="drawer"
    ref="drawer"
    class="drawer"
    role="dialog"
    aria-modal="true"
    aria-labelledby="drawer-title"
  >
    <div class="drawer-bar">
      <p class="drawer-kicker">{{ dash.selected.series || "Event" }}</p>
      <button ref="closeButton" type="button" class="btn btn-ghost" @click="dash.closeEvent()">Close</button>
    </div>
    <h2 id="drawer-title">{{ dash.selected.acronym }}</h2>
    <p class="drawer-name">{{ dash.selected.name }}</p>
    <div class="pill-row">
      <EventPills :event="dash.selected" />
    </div>
    <dl class="meta-grid">
      <dt>When</dt><dd>{{ formatRange(dash.selected.start, dash.selected.end) }}</dd>
      <dt>Where</dt><dd>{{ dash.selected.city }}, {{ dash.selected.country }}<template v-if="dash.selected.spain"> · España</template></dd>
      <dt>Region</dt><dd>{{ dash.selected.region }}</dd>
      <dt>Series</dt><dd>{{ dash.selected.series }}</dd>
      <dt>Organizer</dt><dd>{{ dash.selected.organizer }}<template v-if="dash.selected.organizer_detail"> · {{ dash.selected.organizer_detail }}</template></dd>
      <dt>Standing</dt><dd>{{ dash.selected.standing }}</dd>
      <dt>Tier</dt><dd>{{ dash.selected.tier_note }}</dd>
    </dl>
    <p>{{ dash.selected.topic_fit }}</p>
    <p>{{ cfpBlurb(dash.selected, dash.today) }}</p>
    <template v-if="dash.eventLabs(dash.selected).length">
      <h3>Research labs</h3>
      <ul class="lab-list">
        <li v-for="unit in dash.eventLabs(dash.selected)" :key="unit.id">
          <strong>{{ unit.name }}</strong> — {{ unit.members.join(", ") }}. {{ unit.link }}
        </li>
      </ul>
    </template>
    <aside v-if="dash.selected.notes" class="note">
      <strong>Note from the data file</strong>
      <p>{{ dash.selected.notes }}</p>
    </aside>
    <h3>Deadlines</h3>
    <p v-if="!rows(dash.selected).length" class="region-label">No deadlines listed in the data file.</p>
    <ul v-else class="deadlines">
      <li v-for="item in rows(dash.selected)" :key="item.key" :class="{ 'is-past': item.past, 'is-soon': item.soon && item.delta > 30, 'is-urgent': item.soon && item.delta <= 30 }">
        <span>{{ item.label }}</span>
        <span>{{ dash.formatDay(item.date) }}</span>
        <span class="rel">{{ item.past ? `Passed · ${relLabel(item.delta)}` : relLabel(item.delta) }}</span>
      </li>
    </ul>
    <div class="drawer-actions">
      <button v-if="Number.isFinite(dash.selected.lat)" type="button" class="btn btn-accent" @click="emit('show-map', dash.selected)">Show on map</button>
    </div>
    <p class="drawer-links">
      <a v-if="dash.safeUrl(dash.selected.site)" :href="dash.safeUrl(dash.selected.site)" target="_blank" rel="noopener noreferrer">Official site</a>
      <a v-if="dash.safeUrl(dash.selected.cfp) && dash.safeUrl(dash.selected.cfp) !== dash.safeUrl(dash.selected.site)" :href="dash.safeUrl(dash.selected.cfp)" target="_blank" rel="noopener noreferrer">Call for papers</a>
    </p>
  </aside>
</template>
