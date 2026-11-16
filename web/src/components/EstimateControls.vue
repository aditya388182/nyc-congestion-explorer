<script setup lang="ts">
import { computed } from "vue";
import { useEstimateStore } from "../stores/estimate";

const props = defineProps<{ zoneNames: Map<number, string> }>();
const store = useEstimateStore();

const addable = computed(() => [...props.zoneNames.entries()].filter(([id]) => !store.excludeZones.includes(id)).sort((a, b) => a[1].localeCompare(b[1])));
const onAdd = (e: Event): void => {
  const sel = e.target as HTMLSelectElement;
  if (sel.value !== "") store.toggleExclude(Number(sel.value));
  sel.value = "";
};
</script>

<template>
  <form class="controls estimate-controls" aria-label="Estimate settings" @submit.prevent>
    <label>Trip type
      <select v-model="store.tripType" data-testid="est-trip-type">
        <option value="ALL">All</option>
        <option value="YELLOW">Yellow taxi</option>
        <option value="GREEN">Green taxi</option>
        <option value="FHVHV">High-volume ride-hail</option>
      </select>
    </label>
    <label>Control group
      <select v-model="store.control" data-testid="est-control">
        <option value="AB">A + B (all controls)</option>
        <option value="A">A: uncharged Manhattan zones</option>
        <option value="B">B: 60 busiest non-Manhattan zones</option>
      </select>
    </label>
    <label>Outcome
      <select v-model="store.outcome" data-testid="est-outcome">
        <option value="DROPOFFS">Trips ending in the zone</option>
        <option value="PICKUPS">Trips starting in the zone</option>
      </select>
    </label>
    <label class="check">
      <input v-model="store.dropBoundary" type="checkbox" data-testid="est-drop-boundary" />
      Drop boundary zones (unticked: treat them as charged)
    </label>
    <label>Placebo start date (before 2025-01-05; uses pre-toll weeks only)
      <span class="row">
        <input v-model="store.placeboStart" type="date" max="2025-01-04" data-testid="est-placebo" />
        <button type="button" class="btn" :disabled="store.placeboStart === ''" @click="store.placeboStart = ''">Clear</button>
      </span>
    </label>
    <div class="exclusions">
      <label>Exclude a zone from the estimate
        <select data-testid="est-exclude-add" @change="onAdd">
          <option value="">Add a zone…</option>
          <option v-for="[id, name] in addable" :key="id" :value="id">{{ name }}</option>
        </select>
      </label>
      <ul v-if="store.excludeZones.length > 0" class="chips" aria-label="Excluded zones" data-testid="excluded-list">
        <li v-for="id in store.excludeZones" :key="id">
          {{ zoneNames.get(id) ?? `Zone ${id}` }}
          <button type="button" class="chip-x" :aria-label="`Stop excluding ${zoneNames.get(id) ?? id}`" @click="store.toggleExclude(id)">×</button>
        </li>
      </ul>
      <p v-else class="hint">No zones excluded. At most 20 can be excluded.</p>
    </div>
  </form>
</template>
