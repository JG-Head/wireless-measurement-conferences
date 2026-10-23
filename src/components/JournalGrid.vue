<script setup>
import { useDash } from "../composables/useDashboard";
import { accessLabel, journalSubmitUrl, metricLine, money, openIssues, quartileLabel } from "../lib/journals";
import JournalVia from "./JournalVia.vue";

const dash = useDash();

function labs(journal) {
  return (journal.affinity_units || []).map((id) => dash.labById(id)).filter(Boolean);
}
</script>

<template>
  <section id="view-journals" role="tabpanel" aria-labelledby="tab-journals" :hidden="dash.state.view !== 'journals'">
    <div v-if="!dash.journalList.length" class="empty">
      <p>No journals are in the data file.</p>
    </div>
    <div v-else-if="!dash.journals.length" class="empty">
      <p>No journals match these filters.</p>
      <p class="empty-actions">
        <button type="button" class="btn btn-ghost" @click="dash.clearFilters()">Clear filters</button>
      </p>
    </div>
    <div v-else class="cards">
      <article
        v-for="journal in dash.journals"
        :key="journal.id"
        class="journal-card"
        :class="{ 'is-selected': dash.state.journal === journal.id }"
        :data-id="journal.id"
      >
        <div class="event-acronym">
          {{ journal.acronym }}
          <span class="pill-row">
            <span class="pill org">{{ journal.publisher }}</span>
            <span v-if="journal.percentile" class="pill high">{{ journal.percentile.label }}</span>
          </span>
        </div>
        <JournalVia :journal="journal" />
        <h3>{{ journal.name }}</h3>
        <p v-if="journal.former_name" class="journal-meta">Formerly {{ journal.former_name }}</p>
        <p v-if="journal.publisher_detail && journal.publisher_detail !== journal.publisher" class="journal-meta">{{ journal.publisher_detail }}</p>
        <p class="journal-meta">{{ quartileLabel(journal.quartile) }}</p>
        <p v-if="metricLine(journal)" class="journal-meta">{{ metricLine(journal) }}</p>
        <p v-if="journal.percentile" class="journal-meta">
          {{ journal.percentile.metric }}, {{ journal.percentile.percentile }}th percentile, {{ journal.percentile.category }}
        </p>
        <p v-if="accessLabel(journal.open_access)" class="journal-meta">
          {{ accessLabel(journal.open_access) }}
          <template v-if="money(journal.open_access)"> · {{ money(journal.open_access) }}</template>
        </p>
        <p v-if="journal.time_to_decision?.text" class="journal-meta clamp">{{ journal.time_to_decision.text }}</p>
        <p class="journal-fit">{{ journal.fit }}</p>
        <ul v-if="openIssues(journal).length" class="issue-list">
          <li v-for="issue in openIssues(journal)" :key="issue.url">
            <a :href="dash.safeUrl(issue.url)" target="_blank" rel="noopener noreferrer">{{ issue.title }}</a>
            <span>{{ dash.formatDay(issue.deadline) }}</span>
          </li>
        </ul>
        <p v-if="labs(journal).length" class="pill-row">
          <span v-for="unit in labs(journal)" :key="unit.id" class="pill lab">{{ unit.name }}</span>
        </p>
        <p class="links">
          <a v-if="dash.safeUrl(journal.website)" :href="dash.safeUrl(journal.website)" target="_blank" rel="noopener noreferrer">Website</a>
        </p>
        <div class="journal-actions">
          <a
            v-if="dash.safeUrl(journalSubmitUrl(journal))"
            class="btn btn-accent"
            :href="dash.safeUrl(journalSubmitUrl(journal))"
            target="_blank"
            rel="noopener noreferrer"
          >Submit paper</a>
          <button
            type="button"
            class="btn btn-ghost"
            :aria-expanded="dash.state.journal === journal.id"
            aria-haspopup="dialog"
            :aria-controls="dash.state.journal === journal.id ? 'journal-drawer' : undefined"
            :aria-label="`Info about ${journal.acronym}`"
            @click="dash.openJournal(journal.id, $event.currentTarget)"
          >Info</button>
        </div>
      </article>
    </div>
  </section>
</template>
