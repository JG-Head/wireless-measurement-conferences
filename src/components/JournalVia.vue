<script setup>
import { computed } from "vue";
import { useDash } from "../composables/useDashboard";
import { viaConference, viaLabel } from "../lib/journals";

const props = defineProps({
  journal: { type: Object, required: true },
  detail: { type: Boolean, default: false }
});

const dash = useDash();
const via = computed(() => viaConference(props.journal));
const label = computed(() => viaLabel(props.journal));
const event = computed(() => (via.value ? dash.eventById(via.value.eventId) : null));
const deadlines = computed(() => (event.value ? dash.deadlineEntries(event.value) : []));
const href = computed(() => (via.value ? `?event=${encodeURIComponent(via.value.eventId)}` : ""));
const cycleName = computed(() => event.value?.acronym || via.value?.conference || "");
</script>

<template>
  <div v-if="via" class="via-block">
    <h3 v-if="detail">Conference cycle</h3>
    <p class="pill-row">
      <span class="pill via">{{ label }}</span>
    </p>
    <p class="journal-meta">
      <a :href="href">Open {{ cycleName }}</a>
    </p>
    <p v-if="detail">{{ label }}. The dates below are the next cycle stored for this conference.</p>
    <p v-else-if="deadlines.length" class="journal-meta">Next cycle</p>
    <ul v-if="deadlines.length" :class="detail ? 'deadlines' : 'issue-list'">
      <li v-for="item in deadlines" :key="item.key">
        <span>{{ item.label }}</span>
        <span>{{ dash.formatDay(item.date) }}</span>
      </li>
    </ul>
    <p v-if="detail && dash.safeUrl(via.sourceUrl)">
      <a :href="dash.safeUrl(via.sourceUrl)" target="_blank" rel="noopener noreferrer">Conference call</a>
    </p>
  </div>
</template>
