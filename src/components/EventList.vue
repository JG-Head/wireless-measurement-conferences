<script setup>
import { useDash } from "../composables/useDashboard";
import { cfpRole, daysFromToday, formatRange, isNow, isOwnVenue, nextDeadline, relLabel, statusClass, affinityLabel, SOON_DAYS } from "../lib/model";
import EventPills from "./EventPills.vue";

const dash = useDash();

const columns = [
  ["name", "Event"],
  ["date", "When"],
  ["country", "Where"],
  ["status", "Status"],
  ["affinity", "Venue fit"],
  ["deadline", "Next deadline"]
];

function ariaSort(key) {
  if (dash.state.sort !== key) return "none";
  return dash.state.dir === "asc" ? "ascending" : "descending";
}

function arrow(key) {
  if (dash.state.sort !== key) return "";
  return dash.state.dir === "asc" ? " ↑" : " ↓";
}

function onRowKey(event, id) {
  if (event.key !== "Enter" && event.key !== " ") return;
  if (event.target.closest("a, button")) return;
  event.preventDefault();
  dash.openEvent(id, event.currentTarget);
}

function deadline(event) {
  const next = nextDeadline(event, dash.today);
  if (next) {
    const delta = daysFromToday(next.date, dash.today);
    return { text: `${next.label} · ${dash.formatDay(next.date)}`, when: delta <= SOON_DAYS ? relLabel(delta) : "", closed: false, upcoming: false };
  }
  if (cfpRole(event, dash.today) === "upcoming") return { text: "CFP date not in this file", when: "", closed: false, upcoming: true };
  return { text: "Attend only", when: "", closed: true, upcoming: false };
}
</script>

<template>
  <section id="view-list" role="tabpanel" aria-labelledby="tab-list">
    <div v-if="!dash.sorted.length" class="empty">
      <p>{{ dash.emptyMessage }}</p>
      <p class="empty-actions">
        <button v-if="dash.state.submissions" type="button" class="btn btn-accent" @click="dash.patch({ submissions: false })">Show attend-only too</button>
        <button type="button" class="btn btn-ghost" @click="dash.clearFilters()">Clear filters</button>
      </p>
    </div>

    <div v-else-if="dash.state.layout === 'cards'" class="cards">
      <article
        v-for="event in dash.sorted"
        :key="event.id"
        class="event-card"
        :class="{ 'is-spain': event.spain, 'is-selected': dash.state.event === event.id }"
        :data-id="event.id"
        tabindex="0"
        @click="dash.openEvent(event.id, $event.currentTarget)"
        @keydown="onRowKey($event, event.id)"
      >
        <div class="event-acronym">
          {{ event.acronym }}
          <EventPills :event="event" />
        </div>
        <h3>{{ event.name }}</h3>
        <p>{{ formatRange(event.start, event.end) }}</p>
        <p class="place">{{ event.city }}, {{ event.country }}</p>
        <p class="region-label">{{ event.region }} · {{ event.tier_note }}</p>
        <p v-if="event.notes" class="event-note">{{ event.notes }}</p>
        <div class="deadline-cell" :class="{ 'is-closed': deadline(event).closed }">
          {{ deadline(event).text }}
          <span v-if="deadline(event).when" class="when">{{ deadline(event).when }}</span>
        </div>
        <p class="fit">{{ event.topic_fit }}</p>
        <p class="links" @click.stop>
          <a v-if="dash.safeUrl(event.site)" :href="dash.safeUrl(event.site)" target="_blank" rel="noopener noreferrer">Official site</a>
          <a v-if="dash.safeUrl(event.cfp) && dash.safeUrl(event.cfp) !== dash.safeUrl(event.site)" :href="dash.safeUrl(event.cfp)" target="_blank" rel="noopener noreferrer">Call for papers</a>
        </p>
      </article>
    </div>

    <div v-else class="table-scroll">
      <table class="event-table">
        <thead>
          <tr>
            <th v-for="[key, label] in columns" :key="key" scope="col" :aria-sort="ariaSort(key)">
              <button type="button" @click="dash.setSort(key)">{{ label }}{{ arrow(key) }}</button>
            </th>
            <th scope="col">Topic fit</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="event in dash.sorted"
            :key="event.id"
            :data-id="event.id"
            tabindex="0"
            :class="{ 'is-spain': event.spain, 'is-selected': dash.state.event === event.id }"
            @click="dash.openEvent(event.id, $event.currentTarget)"
            @keydown="onRowKey($event, event.id)"
          >
            <td>
              <div class="event-acronym">
                {{ event.acronym }}
                <EventPills :event="event" variant="short" />
              </div>
              <div class="event-name">{{ event.name }}</div>
              <div class="event-tier">{{ event.tier_note }}</div>
              <p v-if="event.notes" class="event-note">{{ event.notes }}</p>
            </td>
            <td>{{ formatRange(event.start, event.end) }}</td>
            <td>
              <div class="place">{{ event.city }}, {{ event.country }}</div>
              <div class="region-label">{{ event.region }}</div>
              <div class="pill-row">
                <span v-if="isNow(event, dash.today)" class="pill now">Now</span>
                <span v-if="event.spain" class="pill spain">España</span>
                <span v-if="isOwnVenue(event, dash.data.user_venues)" class="pill own">Own venue</span>
                <span v-for="unit in dash.eventLabs(event)" :key="unit.id" class="pill lab" :class="{ 'is-on': dash.state.labs.includes(unit.id) }">{{ unit.name }}</span>
              </div>
            </td>
            <td><span class="pill" :class="statusClass(event.status)">{{ event.status }}</span></td>
            <td><span class="pill" :class="event.affinity || 'neutral'">{{ affinityLabel(event.affinity) }}</span></td>
            <td>
              <div class="deadline-cell" :class="{ 'is-closed': deadline(event).closed }">
                {{ deadline(event).text }}
                <span v-if="deadline(event).when" class="when">{{ deadline(event).when }}</span>
              </div>
            </td>
            <td>
              <div class="fit">{{ event.topic_fit }}</div>
              <div class="links" @click.stop>
                <a v-if="dash.safeUrl(event.site)" :href="dash.safeUrl(event.site)" target="_blank" rel="noopener noreferrer">Official site</a>
                <a v-if="dash.safeUrl(event.cfp) && dash.safeUrl(event.cfp) !== dash.safeUrl(event.site)" :href="dash.safeUrl(event.cfp)" target="_blank" rel="noopener noreferrer">Call for papers</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
