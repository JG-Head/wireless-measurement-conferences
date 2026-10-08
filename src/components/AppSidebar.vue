<script setup>
import { computed } from "vue";
import { useDash } from "../composables/useDashboard";
import { ORGANIZERS, VIEWS, affinityLabel } from "../lib/model";

const dash = useDash();
const secondaryOpen = computed(() => dash.secondaryLabs.some((unit) => dash.state.labs.includes(unit.id)));

function onViewKey(event) {
  const index = VIEWS.indexOf(dash.state.view);
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    event.preventDefault();
    const next = VIEWS[(index + 1) % VIEWS.length];
    dash.setView(next);
    document.getElementById(`tab-${next}`)?.focus();
  } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
    event.preventDefault();
    const next = VIEWS[(index + VIEWS.length - 1) % VIEWS.length];
    dash.setView(next);
    document.getElementById(`tab-${next}`)?.focus();
  }
}

function surname(unit) {
  return String(unit.contact || "").split(" ").pop();
}
</script>

<template>
  <div class="sidebar-inner">
    <p class="sidebar-kicker">{{ dash.ownerName }}</p>
    <h2 class="section-title">Filters</h2>
    <p class="sidebar-lede">Default view: where a paper can still be submitted, or the CFP date is not in the file yet. Spain events are marked España.</p>
    <p class="verified">{{ dash.verifiedLabel }}</p>
    <p v-if="dash.scholar" class="sidebar-links">
      <a class="text-link" :href="dash.scholar">Google Scholar</a>
      <a class="text-link" href="#about">About this list</a>
    </p>

    <div class="view-switch" role="tablist" aria-label="Views" @keydown="onViewKey">
      <button
        v-for="view in VIEWS"
        :id="`tab-${view}`"
        :key="view"
        type="button"
        role="tab"
        :aria-selected="dash.state.view === view"
        :tabindex="dash.state.view === view ? 0 : -1"
        :aria-controls="`view-${view}`"
        @click="dash.setView(view)"
      >
        <i :class="view === 'list' ? 'bi bi-list-ul' : view === 'map' ? 'bi bi-geo-alt' : 'bi bi-calendar3'" aria-hidden="true"></i>
        {{ view === 'list' ? 'List' : view === 'map' ? 'Map' : 'Timeline' }}
      </button>
    </div>

    <form class="sidebar-filters" role="search" @submit.prevent>
      <label class="field">
        <span>Search</span>
        <input v-model="dash.state.q" class="form-control" type="search" placeholder="Name, city, series, organizer, lab" autocomplete="off" @input="dash.persist()">
      </label>

      <div class="field">
        <span>Quick filters</span>
        <button type="button" class="toggle toggle-submit" :aria-pressed="dash.state.submissions" @click="dash.patch({ submissions: !dash.state.submissions })">
          <span>Submission opportunities</span>
          <small>Open CFP, or date not in file</small>
        </button>
        <button type="button" class="toggle toggle-spain" :aria-pressed="dash.state.spain" @click="dash.patch({ spain: !dash.state.spain })">
          <span>Spain</span>
          <small>España</small>
        </button>
        <button type="button" class="toggle" :aria-pressed="dash.state.region === 'Europe'" @click="dash.patch({ region: dash.state.region === 'Europe' ? 'all' : 'Europe' })">Europe</button>
        <button type="button" class="toggle toggle-soon" :aria-pressed="dash.state.soon" @click="dash.patch({ soon: !dash.state.soon })">
          <span>Paper deadlines soon</span>
          <small>90 days</small>
        </button>
      </div>

      <div class="field">
        <span id="organizer-label">Organizer · Organizador</span>
        <div class="org-filters" role="group" aria-labelledby="organizer-label">
          <button
            v-for="name in ORGANIZERS"
            :key="name"
            type="button"
            class="org-chip"
            :data-org="name"
            :aria-pressed="dash.state.organizers.includes(name)"
            @click="dash.toggleOrganizer(name)"
          >{{ name }}</button>
        </div>
      </div>

      <label class="field">
        <span>Region</span>
        <select v-model="dash.state.region" class="form-select" @change="dash.persist()">
          <option value="all">All regions</option>
          <option v-for="region in dash.regions" :key="region" :value="region">{{ region }}</option>
        </select>
      </label>

      <label class="field">
        <span>Status</span>
        <select v-model="dash.state.status" class="form-select" @change="dash.persist()">
          <option value="all">All statuses</option>
          <option v-for="status in dash.statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>

      <label class="field">
        <span>Venue fit</span>
        <select v-model="dash.state.affinity" class="form-select" @change="dash.persist()">
          <option value="all">All affinities</option>
          <option v-for="affinity in dash.affinities" :key="affinity" :value="affinity">{{ affinityLabel(affinity) }}</option>
        </select>
      </label>

      <label class="field">
        <span>Sort</span>
        <select v-model="dash.state.sort" class="form-select" @change="dash.state.dir = 'asc'; dash.persist()">
          <option value="date">Date</option>
          <option value="deadline">Next deadline</option>
          <option value="affinity">Affinity</option>
          <option value="name">Name</option>
          <option value="country">Country</option>
          <option value="status">Status</option>
        </select>
      </label>

      <div class="field">
        <span id="lab-label">Research labs</span>
        <div class="lab-filters" role="group" aria-labelledby="lab-label">
          <button
            v-for="unit in dash.coreLabs"
            :key="unit.id"
            type="button"
            class="lab-chip"
            :aria-pressed="dash.state.labs.includes(unit.id)"
            @click="dash.toggleLab(unit.id)"
          >
            <span>{{ unit.name }}</span>
            <small>{{ surname(unit) }}</small>
          </button>
          <details v-if="dash.secondaryLabs.length" class="lab-more" :open="secondaryOpen">
            <summary>Secondary seeds</summary>
            <div class="lab-filters">
              <button
                v-for="unit in dash.secondaryLabs"
                :key="unit.id"
                type="button"
                class="lab-chip"
                :aria-pressed="dash.state.labs.includes(unit.id)"
                @click="dash.toggleLab(unit.id)"
              >
                <span>{{ unit.name }}</span>
                <small>{{ surname(unit) }}</small>
              </button>
            </div>
          </details>
        </div>
        <p v-if="dash.state.labs.length" class="lab-note">{{ dash.state.labs.map((id) => dash.labById(id)?.link).filter(Boolean).join(' ') }}</p>
      </div>

      <button type="button" class="btn btn-ghost w-100" @click="dash.clearFilters()">Clear filters</button>
    </form>
  </div>
</template>
