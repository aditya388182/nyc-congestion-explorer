<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import EstimateControls from "../components/EstimateControls.vue";
import LineChart from "../components/LineChart.vue";
import ResultTables from "../components/ResultTables.vue";
import StatusBlock from "../components/StatusBlock.vue";
import { runQuery } from "../lib/api";
import { fmtMs, fmtNum, fmtP, fmtPct } from "../lib/format";
import { EventStudyDocument, TablesDocument, ZoneNamesDocument } from "../graphql/generated/graphql";
import type { EventStudyQuery } from "../graphql/generated/graphql";
import { useEstimateStore } from "../stores/estimate";

const store = useEstimateStore();

// ---- live estimate (debounced) ----
let timer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => JSON.stringify(store.input),
  () => {
    clearTimeout(timer);
    timer = setTimeout(() => void store.run(), 200);
  },
);
onMounted(() => void store.run());
onBeforeUnmount(() => {
  clearTimeout(timer);
});

// ---- zone names for the exclusion picker ----
const zoneNames = ref(new Map<number, string>());
onMounted(async () => {
  try {
    const d = await runQuery(ZoneNamesDocument, {});
    zoneNames.value = new Map(d.zones.filter((z) => ["TREATED", "CONTROL_A", "CONTROL_B", "BOUNDARY"].includes(z.group)).map((z) => [z.id, z.name]));
  } catch {
    /* the picker stays empty; the estimate itself still works */
  }
});

// ---- event study for the chosen trip type and control ----
const es = ref<EventStudyQuery["eventStudy"] | null>(null);
const esLoading = ref(false);
const esError = ref("");
const esUnavailable = computed(() => store.tripType === "GREEN");
async function loadEs(): Promise<void> {
  if (esUnavailable.value) {
    es.value = null;
    return;
  }
  esLoading.value = true;
  esError.value = "";
  try {
    es.value = (await runQuery(EventStudyDocument, { tripType: store.tripType, control: store.control })).eventStudy;
  } catch (e) {
    esError.value = e instanceof Error ? e.message : "Unknown error";
  } finally {
    esLoading.value = false;
  }
}
onMounted(() => void loadEs());
watch(() => [store.tripType, store.control], loadEs);

const esChart = computed(() => {
  if (!es.value) return null;
  // month -1 is the omitted reference: draw it as an exact zero
  const pts = [...es.value.points, { month: -1, effectPct: 0, ciLowPct: 0, ciHighPct: 0 }].sort((a, b) => a.month - b.month);
  return {
    labels: pts.map((p) => String(p.month)),
    marker: pts.findIndex((p) => p.month === 0) - 0.5,
    series: [
      { label: "", data: pts.map((p) => p.ciLowPct), color: "#1d4ed8", band: true },
      { label: "95% CI", data: pts.map((p) => p.ciHighPct), color: "#1d4ed8", band: true, fillTo: "-1" },
      { label: "Treated vs control, % difference from month −1", data: pts.map((p) => p.effectPct), color: "#1d4ed8" },
    ],
  };
});

// ---- precomputed tables ----
const tables = useQuery({ query: TablesDocument });
const specRows = computed(() => tables.data.value?.specs.map((s) => ({ ...s, label: s.label })) ?? []);
const placeboRows = computed(() => tables.data.value?.placebos.map((p) => ({ ...p, label: `Placebo start ${p.start} (pre-toll weeks only)` })) ?? []);
const tablesError = computed(() => tables.error.value?.message ?? "");

const warn = computed(() => es.value !== null && es.value.leadTest.slopeP < 0.05);
</script>

<template>
  <section aria-labelledby="est-title" class="page">
    <h1 id="est-title">Estimate: difference-in-differences, re-run live</h1>
    <p class="lead">
      Change a setting and the API re-estimates the model on the spot: log weekly trips on zone and week fixed effects and treated × post, standard errors clustered by zone.
      Treated zones come from the data (the share of intra-zone trips that paid the fee).
    </p>
    <EstimateControls :zone-names="zoneNames" />

    <div class="result" aria-live="polite" data-testid="estimate-result">
      <p v-if="store.status === 'loading'" class="status loading" role="status">Estimating…</p>
      <div v-if="store.status === 'error'" class="status error" role="alert" data-testid="estimate-error">
        <strong>Estimate failed ({{ store.errorCode }}).</strong> {{ store.errorMessage }}
        <button type="button" class="btn" @click="store.run()">Try again</button>
      </div>
      <template v-if="store.result && store.status !== 'error'">
        <p class="headline" data-testid="effect-headline">
          <span class="big" data-testid="effect-pct">{{ fmtPct(store.result.effectPct, 2) }}</span>
          <span class="ci">95% CI {{ fmtPct(store.result.ciLowPct, 2) }} to {{ fmtPct(store.result.ciHighPct, 2) }}</span>
        </p>
        <p class="meta">
          {{ store.result.nTreated }} treated and {{ store.result.nControl }} control zones, {{ store.result.nWeeks }} weeks,
          {{ fmtNum(store.result.nObs) }} observations. β = {{ store.result.beta.toFixed(4) }} (SE {{ store.result.se.toFixed(4) }}).
          <span data-testid="compute-ms">{{ store.result.cached ? "Cached" : "Computed" }} in {{ fmtMs(store.result.computeMs) }}.</span>
          <template v-if="store.result.droppedZones.length > 0"> Dropped to keep the panel balanced (a zero-trip week): zones {{ store.result.droppedZones.join(", ") }}.</template>
        </p>
      </template>
    </div>

    <div v-if="warn && es" class="callout warn" role="note" data-testid="pretrend-warning">
      <strong>Read with care: parallel trends is doubtful here.</strong>
      Before the toll, treated zones were already moving {{ fmtPct(es.leadTest.slopePerMonthPct, 2) }} per month relative to control
      (slope test p = {{ fmtP(es.leadTest.slopeP) }}). The number above therefore mixes the toll with that earlier drift and should not be read as the effect of the toll alone.
    </div>

    <h2>Event study</h2>
    <p v-if="esUnavailable" class="hint" data-testid="es-unavailable">The event study is precomputed for yellow, ride-hail and all trips; green taxis have too few balanced zones.</p>
    <StatusBlock :loading="esLoading" :error="esError" what="the event study" @retry="loadEs" />
    <template v-if="es && esChart && !esLoading">
      <LineChart
        :labels="esChart.labels"
        :series="esChart.series"
        y-title="% difference vs month −1"
        x-title="Months relative to January 2025 (the toll started 5 Jan 2025)"
        :marker-index="esChart.marker"
        description="Event study: treated versus control zones, by month relative to January 2025, with 95 percent confidence intervals"
      />
      <p data-testid="lead-test">
        Joint test that all 23 pre-toll coefficients (months −24 to −2) are zero: χ² = {{ es.leadTest.chi2.toFixed(1) }} on {{ es.leadTest.df }} df, p = {{ fmtP(es.leadTest.pChi2) }};
        F = {{ es.leadTest.f.toFixed(2) }}, p = {{ fmtP(es.leadTest.pF) }}.
        This joint test is over-sized in this design (see Data &amp; Method), so the 1-degree-of-freedom pre-trend slope is also shown:
        {{ fmtPct(es.leadTest.slopePerMonthPct, 2) }} per month, p = {{ fmtP(es.leadTest.slopeP) }}.
      </p>
    </template>

    <h2>Placebo dates</h2>
    <StatusBlock :loading="tables.fetching.value" :error="tablesError" what="the tables" @retry="tables.executeQuery({ requestPolicy: 'network-only' })" />
    <ResultTables v-if="placeboRows.length > 0" caption="Fake start dates, pre-toll weeks only (a nonzero effect here means the design finds 'effects' where there are none)" :rows="placeboRows" testid="placebo-table" />
    <h2>Robustness specifications</h2>
    <ResultTables v-if="specRows.length > 0" caption="Eight pre-registered specifications (row 1 is the main specification)" :rows="specRows" testid="specs-table" />
  </section>
</template>
