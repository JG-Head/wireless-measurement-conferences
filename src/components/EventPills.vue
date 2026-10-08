<script setup>
import { useDash } from "../composables/useDashboard";
import { affinityLabel, cfpRole, cfpShort, isNow, isOwnVenue, statusClass } from "../lib/model";

const props = defineProps({
  event: { type: Object, required: true },
  variant: { type: String, default: "full" }
});

const dash = useDash();
const role = () => cfpRole(props.event, dash.today);
</script>

<template>
  <span v-if="event.organizer" class="pill org" :class="`org-${event.organizer === 'IEEE' ? 'ieee' : event.organizer === 'ACM' ? 'acm' : 'other'}`">{{ event.organizer }}</span>
  <template v-if="variant === 'full'">
    <span v-if="role() === 'open'" class="pill open">Open CFP</span>
    <span v-else-if="role() === 'upcoming'" class="pill upcoming">CFP date not in file</span>
    <span v-else class="pill attend">Attend only</span>
    <span v-if="isNow(event, dash.today)" class="pill now">Now · En curso</span>
    <span v-if="event.spain" class="pill spain">Spain · España</span>
    <span class="pill" :class="event.affinity || 'neutral'">{{ affinityLabel(event.affinity) }} affinity</span>
    <span class="pill" :class="statusClass(event.status)">{{ event.status || "Status" }}</span>
    <span v-if="isOwnVenue(event, dash.data.user_venues)" class="pill own" title="Researcher has published in this series">Own venue</span>
    <span
      v-for="unit in dash.eventLabs(event)"
      :key="unit.id"
      class="pill lab"
      :class="{ 'is-on': dash.state.labs.includes(unit.id) }"
    >{{ unit.name }}</span>
  </template>
  <span v-else-if="variant === 'short'" class="pill" :class="role() === 'open' ? 'open' : role() === 'upcoming' ? 'upcoming' : 'attend'">{{ cfpShort(event, dash.today) }}</span>
</template>
