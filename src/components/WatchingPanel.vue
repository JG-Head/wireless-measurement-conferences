<script setup>
import { useDash } from "../composables/useDashboard";
import { isHighSeries, isOwnVenue } from "../lib/model";

const dash = useDash();
</script>

<template>
  <section id="watching" class="panel" aria-labelledby="watching-heading">
    <h2 id="watching-heading">Still watching</h2>
    <p class="intro">{{ dash.watchIntro }}</p>
    <div class="watch-grid">
      <article v-for="item in dash.watching" :key="item.series" class="watch-card card">
        <h3>
          {{ item.series }}
          <span v-if="item.organizer" class="pill org" :class="`org-${item.organizer === 'ACM' ? 'acm' : item.organizer === 'Other' ? 'other' : 'ieee'}`">{{ item.organizer }}</span>
          <span v-if="isHighSeries(item.series)" class="pill high">High affinity</span>
          <span v-if="isOwnVenue(item, dash.data.user_venues)" class="pill own">Own venue</span>
        </h3>
        <p>{{ item.note }}</p>
        <div v-if="dash.eventLabs(item).length" class="pill-row">
          <span v-for="unit in dash.eventLabs(item)" :key="unit.id" class="pill lab" :class="{ 'is-on': dash.state.labs.includes(unit.id) }">{{ unit.name }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
