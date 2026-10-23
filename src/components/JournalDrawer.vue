<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useDash } from "../composables/useDashboard";
import { accessLabel, BLANK, journalSubmitUrl, money, openIssues, quartileLabel } from "../lib/journals";
import JournalVia from "./JournalVia.vue";

const dash = useDash();
const drawer = ref(null);
const closeButton = ref(null);

function textOf(block) {
  if (!block) return "";
  return typeof block === "string" ? block : block.text || "";
}

function sourceOf(block) {
  if (!block || typeof block === "string") return "";
  return dash.safeUrl(block.source_url || block.url || "");
}

function onKey(event) {
  if (!dash.selectedJournal || !drawer.value) return;
  if (event.key === "Escape") {
    event.preventDefault();
    dash.closeJournal();
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

watch(() => dash.selectedJournal?.id, async (id) => {
  document.body.style.overflow = id ? "hidden" : "";
  if (!id) return;
  await nextTick();
  closeButton.value?.focus();
}, { immediate: true });

onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.body.style.overflow = "";
});
</script>

<template>
  <div v-if="dash.selectedJournal" class="backdrop" @click="dash.closeJournal()"></div>
  <aside
    v-if="dash.selectedJournal"
    id="journal-drawer"
    ref="drawer"
    class="drawer"
    role="dialog"
    aria-modal="true"
    aria-labelledby="journal-drawer-title"
  >
    <div class="drawer-bar">
      <p class="drawer-kicker">{{ dash.selectedJournal.publisher }}</p>
      <button ref="closeButton" type="button" class="btn btn-ghost" @click="dash.closeJournal()">Close</button>
    </div>
    <h2 id="journal-drawer-title">{{ dash.selectedJournal.acronym }}</h2>
    <p class="drawer-name">{{ dash.selectedJournal.name }}</p>
    <p v-if="dash.selectedJournal.former_name">Formerly {{ dash.selectedJournal.former_name }}.</p>
    <div class="pill-row">
      <span class="pill org">{{ dash.selectedJournal.publisher }}</span>
      <span class="pill announced">{{ dash.selectedJournal.quartile.value }}</span>
      <span v-if="dash.selectedJournal.percentile" class="pill high">
        {{ dash.selectedJournal.percentile.label }} · {{ dash.selectedJournal.percentile.metric }}
      </span>
    </div>
    <JournalVia :journal="dash.selectedJournal" detail />

    <dl class="meta-grid journal-metrics">
      <dt>Quartile</dt>
      <dd>
        {{ quartileLabel(dash.selectedJournal.quartile) }}
        <a v-if="dash.safeUrl(dash.selectedJournal.quartile.source_url)" :href="dash.safeUrl(dash.selectedJournal.quartile.source_url)" target="_blank" rel="noopener noreferrer">Source</a>
      </dd>
      <template v-if="dash.selectedJournal.impact_factor">
        <dt>JIF</dt>
        <dd>
          {{ dash.selectedJournal.impact_factor.value }} ({{ dash.selectedJournal.impact_factor.year }}), {{ dash.selectedJournal.impact_factor.quartile }}.
          {{ dash.selectedJournal.impact_factor.source_label }}
          <template v-if="dash.selectedJournal.impact_factor.note"> {{ dash.selectedJournal.impact_factor.note }}</template>
          <a v-if="dash.safeUrl(dash.selectedJournal.impact_factor.source_url)" :href="dash.safeUrl(dash.selectedJournal.impact_factor.source_url)" target="_blank" rel="noopener noreferrer">Source</a>
        </dd>
      </template>
      <template v-if="dash.selectedJournal.citescore">
        <dt>CiteScore</dt>
        <dd>
          {{ dash.selectedJournal.citescore.value }} ({{ dash.selectedJournal.citescore.year }})
          <template v-if="dash.selectedJournal.citescore.category"> · {{ dash.selectedJournal.citescore.category }}</template>
          <template v-if="dash.selectedJournal.citescore.percentile"> · {{ dash.selectedJournal.citescore.percentile }}th percentile</template>
          <template v-if="dash.selectedJournal.citescore.note"> {{ dash.selectedJournal.citescore.note }}</template>
          <a v-if="dash.safeUrl(dash.selectedJournal.citescore.source_url)" :href="dash.safeUrl(dash.selectedJournal.citescore.source_url)" target="_blank" rel="noopener noreferrer">Source</a>
        </dd>
      </template>
    </dl>

    <h3>Author guidelines</h3>
    <p v-if="dash.safeUrl(dash.selectedJournal.guidelines_url)">
      <a :href="dash.safeUrl(dash.selectedJournal.guidelines_url)" target="_blank" rel="noopener noreferrer">Author guidelines</a>
    </p>
    <p v-else>{{ BLANK }}</p>
    <p v-if="dash.selectedJournal.submission_note">{{ dash.selectedJournal.submission_note }}</p>

    <h3>Paper types and length</h3>
    <p>{{ textOf(dash.selectedJournal.paper_types) || BLANK }}</p>
    <p v-if="sourceOf(dash.selectedJournal.paper_types)">
      <a :href="sourceOf(dash.selectedJournal.paper_types)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>
    <p>{{ textOf(dash.selectedJournal.length_limits) || BLANK }}</p>
    <p v-if="sourceOf(dash.selectedJournal.length_limits) && sourceOf(dash.selectedJournal.length_limits) !== sourceOf(dash.selectedJournal.paper_types)">
      <a :href="sourceOf(dash.selectedJournal.length_limits)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>

    <h3>Template and format</h3>
    <p>
      {{ textOf(dash.selectedJournal.template) || BLANK }}
      <a v-if="dash.safeUrl(dash.selectedJournal.template?.url)" :href="dash.safeUrl(dash.selectedJournal.template.url)" target="_blank" rel="noopener noreferrer">Template</a>
    </p>
    <p v-if="sourceOf(dash.selectedJournal.template)">
      <a :href="sourceOf(dash.selectedJournal.template)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>

    <h3>Review model</h3>
    <p>{{ textOf(dash.selectedJournal.review_model) || BLANK }}</p>
    <p v-if="sourceOf(dash.selectedJournal.review_model)">
      <a :href="sourceOf(dash.selectedJournal.review_model)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>

    <h3>Page charges and APC</h3>
    <p>{{ textOf(dash.selectedJournal.overlength) || BLANK }}</p>
    <p v-if="sourceOf(dash.selectedJournal.overlength)">
      <a :href="sourceOf(dash.selectedJournal.overlength)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>
    <p v-if="dash.selectedJournal.open_access">
      {{ accessLabel(dash.selectedJournal.open_access) }}.
      <template v-if="dash.selectedJournal.open_access.charges"> APC {{ money(dash.selectedJournal.open_access) }}.</template>
      <template v-else-if="dash.selectedJournal.open_access.charges === false"> No article processing charge is stated.</template>
      {{ dash.selectedJournal.open_access.note }}
    </p>
    <p v-else>Open access and APC: {{ BLANK }}</p>
    <p v-if="dash.safeUrl(dash.selectedJournal.open_access?.source_url)">
      <a :href="dash.safeUrl(dash.selectedJournal.open_access.source_url)" target="_blank" rel="noopener noreferrer">APC source</a>
    </p>

    <h3>Open access</h3>
    <p v-if="dash.selectedJournal.open_access">
      {{ accessLabel(dash.selectedJournal.open_access) }}.
      <template v-if="dash.selectedJournal.open_access.model === 'full'">Every article is open access.</template>
      <template v-else-if="dash.selectedJournal.open_access.model === 'hybrid'">Authors can publish in the subscription issue or pay for open access.</template>
    </p>
    <p v-else>{{ BLANK }}</p>

    <h3>Time to decision</h3>
    <p>{{ textOf(dash.selectedJournal.time_to_decision) || BLANK }}</p>
    <p v-if="dash.selectedJournal.publication_target?.text">{{ dash.selectedJournal.publication_target.text }}</p>
    <p v-if="sourceOf(dash.selectedJournal.time_to_decision)">
      <a :href="sourceOf(dash.selectedJournal.time_to_decision)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>
    <p v-if="sourceOf(dash.selectedJournal.publication_target)">
      <a :href="sourceOf(dash.selectedJournal.publication_target)" target="_blank" rel="noopener noreferrer">Publication-target source</a>
    </p>

    <h3>Scope</h3>
    <p>{{ dash.selectedJournal.scope || BLANK }}</p>
    <p v-if="dash.safeUrl(dash.selectedJournal.scope_source)">
      <a :href="dash.safeUrl(dash.selectedJournal.scope_source)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>

    <h3>Fit for this list</h3>
    <p class="journal-fit">{{ dash.selectedJournal.fit }}</p>

    <h3>Editor-in-chief</h3>
    <p v-if="dash.selectedJournal.editor_in_chief">
      {{ dash.selectedJournal.editor_in_chief.name }}<template v-if="dash.selectedJournal.editor_in_chief.affiliation">, {{ dash.selectedJournal.editor_in_chief.affiliation }}</template>
    </p>
    <p v-else-if="dash.selectedJournal.editor_note">{{ dash.selectedJournal.editor_note }}</p>
    <p v-else>{{ BLANK }}</p>
    <p v-if="dash.safeUrl(dash.selectedJournal.editor_in_chief?.source_url)">
      <a :href="dash.safeUrl(dash.selectedJournal.editor_in_chief.source_url)" target="_blank" rel="noopener noreferrer">Source</a>
    </p>

    <h3>Special issues</h3>
    <p v-if="!openIssues(dash.selectedJournal).length">No open special issue with a deadline was listed on the pages checked.</p>
    <ul v-else class="deadlines">
      <li v-for="issue in openIssues(dash.selectedJournal)" :key="issue.url">
        <span><a :href="dash.safeUrl(issue.url)" target="_blank" rel="noopener noreferrer">{{ issue.title }}</a></span>
        <span>{{ dash.formatDay(issue.deadline) }}</span>
        <span v-if="issue.publication" class="rel">{{ issue.publication }}</span>
      </li>
    </ul>

    <template v-if="dash.journalLabs(dash.selectedJournal).length">
      <h3>Research labs</h3>
      <ul class="lab-list">
        <li v-for="unit in dash.journalLabs(dash.selectedJournal)" :key="unit.id">
          <strong>{{ unit.name }}</strong> — {{ unit.members.join(", ") }}. {{ unit.link }}
        </li>
      </ul>
    </template>

    <div class="drawer-actions">
      <a
        v-if="dash.safeUrl(journalSubmitUrl(dash.selectedJournal))"
        class="btn btn-accent"
        :href="dash.safeUrl(journalSubmitUrl(dash.selectedJournal))"
        target="_blank"
        rel="noopener noreferrer"
      >Submit paper</a>
    </div>
    <p class="drawer-links">
      <a v-if="dash.safeUrl(dash.selectedJournal.website)" :href="dash.safeUrl(dash.selectedJournal.website)" target="_blank" rel="noopener noreferrer">Website</a>
      <a v-if="dash.safeUrl(dash.selectedJournal.guidelines_url)" :href="dash.safeUrl(dash.selectedJournal.guidelines_url)" target="_blank" rel="noopener noreferrer">Author guidelines</a>
    </p>
  </aside>
</template>
