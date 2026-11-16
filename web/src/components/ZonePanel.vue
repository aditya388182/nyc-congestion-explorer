<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { runQuery } from "../lib/api";
import { fmtPct } from "../lib/format";
import { ZoneWeeklyDocument } from "../graphql/generated/graphql";
import type { ZoneWeeklyQuery } from "../graphql/generated/graphql";
import { useEstimateStore } from "../stores/estimate";
import { useMapStore } from "../stores/map";
import LineChart from "./LineChart.vue";
import StatusBlock from "./StatusBlock.vue";

const props = defineProps<{ zoneId: number }>();
const emit = defineEmits<{ close: [] }>();
const map = useMapStore();
const estimate = useEstimateStore();

const zone = ref<NonNullable<ZoneWeeklyQuery["zone"]> | null>(null);
const loading = ref(false);
const error = ref("");

const GROUP_LABEL: Record<string, string> = {
  TREATED: "Treated (charged zone)",
  BOUNDARY: "Boundary (partly charged, left out of the main estimate)",
  CONTROL_A: "Control A (Manhattan, not charged)",
  CONTROL_B: "Control B (busy non-Manhattan zone)",
  OTHER: "Not used in any group",
  UNCLASSIFIED: "Too few intra-zone trips to classify",
};
const TOLL_WEEK = "2025-01-05";

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const d = await runQuery(ZoneWeeklyDocument, { id: props.zoneId, tripType: map.tripType, outcome: map.outcome });
    if (!d.zone) throw new Error("Unknown zone");
    zone.value = d.zone;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Unknown error";
  } finally {
    loading.value = false;
  }
}
watch(() => [props.zoneId, map.tripType, map.outcome], load, { immediate: true });

const labels = computed(() => zone.value?.weekly.map((w) => w.weekStart) ?? []);
const markerIndex = computed(() => labels.value.indexOf(TOLL_WEEK));
const excluded = computed(() => estimate.isExcluded(props.zoneId));
</script>

<template>
  <aside class="zone-panel" aria-labelledby="zone-panel-title" data-testid="zone-panel">
    <div class="zone-panel-head">
      <h2 id="zone-panel-title">{{ zone?.name ?? `Zone ${zoneId}` }}</h2>
      <button type="button" class="btn" aria-label="Close zone panel" @click="emit('close')">Close</button>
    </div>
    <StatusBlock :loading="loading" :error="error" what="this zone" @retry="load" />
    <template v-if="zone && !loading && !error">
      <p>
        <span class="tag">{{ GROUP_LABEL[zone.group] ?? zone.group }}</span>
        <span v-if="zone.ring" class="tag ring">Spillover ring</span>
      </p>
      <p>{{ zone.borough }}.
        <template v-if="zone.change !== null && zone.change !== undefined">
          Change, first 52 weeks after 5 Jan 2025 vs the same weeks a year earlier:
          <strong data-testid="zone-change">{{ fmtPct(zone.change) }}</strong>.
        </template>
        <template v-else>No change value (no trips a year earlier).</template>
      </p>
      <LineChart
        :labels="labels"
        :series="[{ label: 'Weekly trips', data: zone.weekly.map((w) => w.trips), color: '#1d4ed8' }]"
        y-title="Trips per week"
        :marker-index="markerIndex"
        marker-label="Toll starts 5 Jan 2025"
        :description="`Weekly trips for ${zone.name}, with the toll start on 5 January 2025 marked`"
      />
      <div class="row">
        <button type="button" class="btn primary" :aria-pressed="excluded" data-testid="exclude-zone" @click="estimate.toggleExclude(zoneId)">
          {{ excluded ? "Excluded from the estimate (click to include)" : "Exclude from the estimate" }}
        </button>
        <RouterLink class="btn" to="/estimate">Open the Estimate page</RouterLink>
      </div>
    </template>
  </aside>
</template>
