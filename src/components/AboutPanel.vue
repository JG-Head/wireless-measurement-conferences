<script setup>
import { useDash } from "../composables/useDashboard";
import { HIGH_SERIES } from "../lib/model";

const dash = useDash();
const dataHref = `${import.meta.env.BASE_URL}data/conferences.json`;
</script>

<template>
  <section id="about" class="panel" aria-labelledby="about-heading">
    <h2 id="about-heading">About this list</h2>
    <p class="intro">
      A planning board for {{ dash.ownerName }} at Universidad Politécnica de Madrid (UPM). It prioritizes venues where the group can still submit. The calendar only shows records in
      <a :href="dataHref">data/conferences.json</a>.
    </p>
    <div class="about-grid">
      <article class="about-card card">
        <h3>Focus</h3>
        <p>{{ dash.data.focus }}</p>
        <p>That includes crowdsourced cellular measurement, CBRS spectrum sharing, and Starlink direct-to-cell (DTC).</p>
        <p v-if="dash.scholar"><a :href="dash.scholar">Google Scholar</a></p>
      </article>
      <article class="about-card card">
        <h3>Own venues</h3>
        <p>Series where this researcher has published. Matching rows carry an Own venue badge.</p>
        <ul>
          <li v-for="venue in dash.data.user_venues || []" :key="venue">{{ venue }}</li>
        </ul>
      </article>
      <article class="about-card card">
        <h3>Research labs</h3>
        <p>{{ dash.labs?.method || "Affinity is one chip per cited-paper coauthor cluster." }}</p>
        <ul>
          <li v-for="unit in dash.coreLabs" :key="unit.id">{{ unit.name }} — {{ unit.contact }}</li>
        </ul>
        <p>Secondary seeds are Jiangchuan Liu, Shangguang Wang, Xinggong Zhang, Zhijing Li, Oughton, and Malandrino. A series is tagged only when that cluster’s cited venues name it. Venue fit (high, medium, low) is separate from these labs.</p>
      </article>
      <article class="about-card card">
        <h3>Submission opportunities</h3>
        <p>The default list keeps two kinds of dated events: a paper or abstract deadline that is still ahead, and an edition whose CFP date is not in the file. Nothing here invents a deadline.</p>
        <p>Meetings whose paper deadline has passed, or that only have camera-ready left, are marked attend-only and stay hidden until Submission opportunities is turned off. ICC and GLOBECOM stay in the pool: wireless networks and measurements are in their topics.</p>
      </article>
      <article class="about-card card">
        <h3>High-affinity series</h3>
        <p>Each edition in the file also has its own affinity field. A series can be high affinity and still sit under Still watching until dates are announced.</p>
        <div class="series-list">
          <span v-for="series in HIGH_SERIES" :key="series" class="pill high">{{ series }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
