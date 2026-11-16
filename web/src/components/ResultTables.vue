<script setup lang="ts">
import { fmtNum, fmtPct } from "../lib/format";

interface Row {
  label: string;
  effectPct: number;
  ciLowPct: number;
  ciHighPct: number;
  nTreated?: number;
  nControl?: number;
  nWeeks: number;
  nObs: number;
  droppedZones?: number[];
}
defineProps<{ caption: string; rows: Row[]; testid: string }>();
</script>

<template>
  <div class="table-wrap" role="region" :aria-label="caption" tabindex="0">
    <table :data-testid="testid">
      <caption>{{ caption }}</caption>
      <thead>
        <tr>
          <th scope="col">Specification</th>
          <th scope="col" class="num">Effect</th>
          <th scope="col" class="num">95% CI</th>
          <th scope="col" class="num">Treated / control zones</th>
          <th scope="col" class="num">Weeks</th>
          <th scope="col" class="num">Observations</th>
          <th scope="col">Dropped (unbalanced) zones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.label">
          <th scope="row">{{ r.label }}</th>
          <td class="num">{{ fmtPct(r.effectPct, 2) }}</td>
          <td class="num">{{ fmtPct(r.ciLowPct, 2) }} to {{ fmtPct(r.ciHighPct, 2) }}</td>
          <td class="num">{{ r.nTreated !== undefined ? `${r.nTreated} / ${r.nControl}` : "same as main" }}</td>
          <td class="num">{{ r.nWeeks }}</td>
          <td class="num">{{ fmtNum(r.nObs) }}</td>
          <td>{{ r.droppedZones && r.droppedZones.length > 0 ? r.droppedZones.join(", ") : "none" }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
