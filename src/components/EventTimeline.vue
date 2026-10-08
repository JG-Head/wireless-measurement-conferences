<script setup>
import { computed } from "vue";
import { useDash } from "../composables/useDashboard";
import { buildTimeline, cfpShort, formatRange } from "../lib/model";

const dash = useDash();
const model = computed(() => {
  const window = dash.data.window || { from: "2026-10-01", to: "2028-10-31" };
  return buildTimeline(dash.sorted, window.from, window.to, dash.today);
});

function meta(event) {
  return [event.organizer, cfpShort(event, dash.today), event.status !== "Confirmed" ? event.status : "", event.notes ? "Note" : ""].filter(Boolean).join(" · ");
}
</script>

<template>
  <section id="view-timeline" role="tabpanel" aria-labelledby="tab-timeline">
    <div v-if="!model.placed.length" class="empty">
      <p>{{ dash.emptyMessage }}</p>
      <p class="empty-actions">
        <button v-if="dash.state.submissions" type="button" class="btn btn-accent" @click="dash.patch({ submissions: false })">Show attend-only too</button>
        <button type="button" class="btn btn-ghost" @click="dash.clearFilters()">Clear filters</button>
      </p>
    </div>
    <template v-else>
      <p class="timeline-help">Scroll sideways across {{ model.fromLabel }} – {{ model.toLabel }}. Orange cards are hosted in Spain. The top edge shows affinity.</p>
      <div class="timeline-scroll">
        <div class="timeline-canvas" :style="{ width: `${model.width}px`, height: `${model.height}px` }">
          <div
            v-for="year in model.years"
            :key="year.year"
            class="year-band"
            :class="{ alt: year.alt }"
            :style="{ left: `${year.x}px`, width: `${year.w}px` }"
          ></div>
          <template v-for="month in model.months" :key="month.iso">
            <div class="month-line" :style="{ left: `${month.x}px` }"></div>
            <div class="month-label" :style="{ left: `${month.x + 6}px` }">{{ month.label }}</div>
          </template>
          <div v-if="model.showToday" class="today-line" :style="{ left: `${model.todayX}px` }"><span>Today</span></div>
          <button
            v-for="item in model.placed"
            :key="item.event.id"
            type="button"
            class="t-card"
            :class="[`is-${item.event.affinity || 'low'}`, `affinity-${item.event.affinity || 'low'}`, { 'is-spain': item.event.spain, 'is-selected': dash.state.event === item.event.id }]"
            :data-id="item.event.id"
            :style="{ left: `${item.x}px`, top: `${model.header + item.lane * model.lanePitch}px` }"
            :title="item.event.notes || item.event.name"
            @click="dash.openEvent(item.event.id, $event.currentTarget)"
          >
            <span class="t-date">{{ formatRange(item.event.start, item.event.end) }}</span>
            <span class="t-acronym">{{ item.event.acronym }}</span>
            <span class="t-place">{{ item.event.city }}<template v-if="item.event.spain"> · España</template></span>
            <span class="t-meta">{{ meta(item.event) }}</span>
          </button>
        </div>
      </div>
    </template>
  </section>
</template>
