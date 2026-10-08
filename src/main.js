import { createApp } from "vue";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";
import App from "./App.vue";
import "./styles.css";
import { createDashboard, dashboardKey } from "./composables/useDashboard";
import { readFilters } from "./lib/model";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const base = import.meta.env.BASE_URL;

async function loadJson(path) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
  return response.json();
}

const root = document.querySelector("#app");

try {
  const data = await loadJson("data/conferences.json");
  if (!Array.isArray(data.events)) throw new Error("events array missing");
  let labs = { units: [] };
  try {
    labs = await loadJson("data/affinity.json");
  } catch {
    labs = { units: [] };
  }
  const initial = readFilters(new URLSearchParams(location.search));
  const dashboard = createDashboard(data, labs, initial);
  createApp(App).provide(dashboardKey, dashboard).mount("#app");
} catch (err) {
  root.innerHTML = `<div class="empty"><p>Conference data failed to load (${err.message}).</p><p>Serve the site over HTTP so <code>data/conferences.json</code> can load.</p></div>`;
}
