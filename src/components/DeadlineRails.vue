<script setup>
import { useDash } from "../composables/useDashboard";
import { SOON_DAYS, formatRange, relLabel } from "../lib/model";

const dash = useDash();
</script>

<template>
  <section v-if="dash.now.length" id="now-rail" class="rail" aria-labelledby="now-heading">
    <h2 id="now-heading">Happening now · En curso</h2>
    <div class="chip-row">
      <button
        v-for="event in dash.now"
        :key="event.id"
        type="button"
        class="now-chip"
        :class="{ 'is-spain': event.spain }"
        @click="dash.openEvent(event.id, $event.currentTarget)"
      >
        <span class="chip-when">In progress</span>
        <span class="chip-what">{{ event.acronym }}</span>
        <span class="chip-place">{{ event.city }}, {{ event.country }}</span>
        <span class="chip-date">{{ formatRange(event.start, event.end) }}</span>
      </button>
    </div>
  </section>

  <section id="soon-rail" class="rail" :class="{ 'is-empty': !dash.soon.length }" aria-labelledby="soon-heading">
    <h2 id="soon-heading">Open paper deadlines · next {{ SOON_DAYS }} days</h2>
    <p v-if="!dash.soon.length">No paper or abstract date in the file falls inside the next {{ SOON_DAYS }} days. Camera-ready dates are not treated as a new submission.</p>
    <template v-else>
      <p class="rail-note">{{ dash.soon.length }} paper or abstract {{ dash.soon.length === 1 ? "date is" : "dates are" }} still ahead. Camera-ready is not counted. Click one to open the event.</p>
      <div class="chip-row">
        <button
          v-for="item in dash.soon"
          :key="`${item.event.id}-${item.key}`"
          type="button"
          class="soon-chip"
          :class="{ 'is-spain': item.event.spain }"
          @click="dash.openEvent(item.event.id, $event.currentTarget)"
        >
          <span class="chip-when">{{ relLabel(item.delta) }}</span>
          <span class="chip-what">{{ item.event.acronym }} · {{ item.label }}</span>
          <span class="chip-date">{{ dash.formatDay(item.date) }}</span>
        </button>
      </div>
    </template>
  </section>
</template>
