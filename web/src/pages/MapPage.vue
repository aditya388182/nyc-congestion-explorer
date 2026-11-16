<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import MapView from "../components/MapView.vue";
import type { ZoneShape } from "../components/MapView.vue";
import StatusBlock from "../components/StatusBlock.vue";
import ZonePanel from "../components/ZonePanel.vue";
import { runQuery } from "../lib/api";
import { CHANGE_DOMAIN, legendGradient } from "../lib/colorScale";
import { MapChangeDocument, MapShapesDocument } from "../graphql/generated/graphql";
import { useMapStore } from "../stores/map";
import type { OutcomeValue, TripTypeValue } from "../stores/map";

const map = useMapStore();
const zones = ref<ZoneShape[]>([]);
const changes = ref(new Map<number, number | null>());
const shapesLoading = ref(true);
const shapesError = ref("");
const changeLoading = ref(false);
const changeError = ref("");

async function loadShapes(): Promise<void> {
  shapesLoading.value = true;
  shapesError.value = "";
  try {
    const d = await runQuery(MapShapesDocument, {});
    zones.value = d.zones;
  } catch (e) {
    shapesError.value = e instanceof Error ? e.message : "Unknown error";
  } finally {
    shapesLoading.value = false;
  }
}
async function loadChange(): Promise<void> {
  changeLoading.value = true;
  changeError.value = "";
  try {
    const d = await runQuery(MapChangeDocument, { tripType: map.tripType, outcome: map.outcome });
    changes.value = new Map(d.zones.map((z) => [z.id, z.change ?? null]));
  } catch (e) {
    changeError.value = e instanceof Error ? e.message : "Unknown error";
  } finally {
    changeLoading.value = false;
  }
}
onMounted(() => {
  void loadShapes();
  void loadChange();
});
watch(() => [map.tripType, map.outcome], loadChange);

const sortedZones = computed(() => [...zones.value].sort((a, b) => a.name.localeCompare(b.name)));
const TRIP_TYPES: { value: TripTypeValue; label: string }[] = [
  { value: "ALL", label: "All (yellow + green + ride-hail)" },
  { value: "YELLOW", label: "Yellow taxi" },
  { value: "GREEN", label: "Green taxi" },
  { value: "FHVHV", label: "High-volume ride-hail (Uber, Lyft)" },
];
const OUTCOMES: { value: OutcomeValue; label: string }[] = [
  { value: "DROPOFFS", label: "Trips ending in the zone" },
  { value: "PICKUPS", label: "Trips starting in the zone" },
];
const gradient = legendGradient();
const onPick = (e: Event): void => {
  const v = (e.target as HTMLSelectElement).value;
  map.select(v === "" ? null : Number(v));
};
</script>

<template>
  <section aria-labelledby="map-title" class="page">
    <h1 id="map-title">Map: change in trips by zone</h1>
    <p class="lead">
      Each zone is coloured by the change in mean weekly trips in the 52 weeks after the toll began (5 January 2025) compared with the same 52 weeks a year earlier.
      This is a raw before/after change, not the causal estimate (see the Estimate page).
    </p>
    <form class="controls" @submit.prevent>
      <label>Trip type
        <select v-model="map.tripType" data-testid="map-trip-type">
          <option v-for="t in TRIP_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>
      <label>Outcome
        <select v-model="map.outcome" data-testid="map-outcome">
          <option v-for="o in OUTCOMES" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>
      <label class="check">
        <input v-model="map.showRing" type="checkbox" data-testid="ring-toggle" />
        Highlight the spillover ring
      </label>
      <label>Zone (keyboard alternative to clicking the map)
        <select :value="map.selectedZoneId ?? ''" data-testid="zone-picker" @change="onPick">
          <option value="">Choose a zone…</option>
          <option v-for="z in sortedZones" :key="z.id" :value="z.id">{{ z.name }} ({{ z.borough }})</option>
        </select>
      </label>
    </form>
    <StatusBlock :loading="shapesLoading" :error="shapesError" what="zone shapes" @retry="loadShapes" />
    <StatusBlock :loading="changeLoading" :error="changeError" what="trip changes" @retry="loadChange" />
    <div class="legend" aria-label="Colour legend" data-testid="legend">
      <span>−{{ CHANGE_DOMAIN }}% or less</span>
      <span class="gradient" :style="{ background: gradient }" role="img" aria-label="Colour scale from brown (fewer trips) through grey (no change) to teal (more trips)"></span>
      <span>+{{ CHANGE_DOMAIN }}% or more</span>
      <span class="nodata"><i></i> no value</span>
      <span class="outline"><i class="treated"></i> treated zones outlined in black</span>
      <span v-if="map.showRing" class="outline"><i class="ring"></i> spillover ring (dashed)</span>
    </div>
    <div class="map-layout" :class="{ 'has-panel': map.selectedZoneId !== null }">
      <MapView :zones="zones" :changes="changes" :show-ring="map.showRing" :selected-id="map.selectedZoneId" @select="map.select" />
      <ZonePanel v-if="map.selectedZoneId !== null" :key="map.selectedZoneId" :zone-id="map.selectedZoneId" @close="map.select(null)" />
    </div>
  </section>
</template>
