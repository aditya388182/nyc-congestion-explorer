<script setup lang="ts">
import { useQuery } from "@urql/vue";
import { computed } from "vue";
import StatusBlock from "../components/StatusBlock.vue";
import { fmtNum, fmtP, fmtPct } from "../lib/format";
import { asObject, num } from "../lib/json";
import { DataMethodDocument } from "../graphql/generated/graphql";

const q = useQuery({ query: DataMethodDocument });
const rec = computed(() => q.data.value?.reconciliation);
const meta = computed(() => q.data.value?.meta);
const h = computed(() => asObject(meta.value?.headline));
const planted = computed(() => asObject(meta.value?.planted));
const sizes = computed(() => asObject(planted.value["size_200_seeds"]));
const explo = computed(() => asObject(meta.value?.exploratory));
const spill = computed(() => asObject(meta.value?.spillover));
const err = computed(() => q.error.value?.message ?? "");
const f = (v: number | null, fn: (x: number) => string): string => (v === null ? "n/a" : fn(v));
</script>

<template>
  <section aria-labelledby="method-title" class="page">
    <h1 id="method-title">Data &amp; method</h1>
    <StatusBlock :loading="q.fetching.value" :error="err" what="the data and method tables" @retry="q.executeQuery({ requestPolicy: 'network-only' })" />

    <h2>The design in plain words</h2>
    <p>
      New York's congestion toll began on Sunday 5 January 2025. We compare weekly trips ending in the charged zone with weekly trips ending in zones that were not charged, before and after that date
      (difference-in-differences with zone and week fixed effects; standard errors clustered by zone, which allows each zone's weeks to be correlated).
      Which zones count as charged is read from the data: a zone is treated if at least 95% of its intra-zone 2025 trips carried the congestion fee, and "boundary" zones in between are left out of the main estimate.
    </p>
    <h3>The pre-registered main specification</h3>
    <p data-testid="main-spec">
      log(trips) = zone fixed effect + week fixed effect + β · (treated × post) + error, outcome: trips ending in the zone, trip type: all, control group: A + B, boundary zones dropped,
      post = weeks starting on or after 5 January 2025, window: {{ meta?.firstWeek }} to {{ meta?.lastWeek }} ({{ meta?.nWeeks }} weeks, weeks start on Sunday). The specification was fixed before any estimate was run.
      Effect % = 100 · (exp(β) − 1).
    </p>
    <p v-if="num(h, 'main_estimate_pct') !== null" data-testid="main-result">
      Result: {{ f(num(h, "main_estimate_pct"), (x) => fmtPct(x, 2)) }} (95% CI {{ f(num(h, "ci_low_pct"), (x) => fmtPct(x, 2)) }} to {{ f(num(h, "ci_high_pct"), (x) => fmtPct(x, 2)) }}).
      <strong>This is not a clean estimate of the toll's effect</strong>: the pre-trend tests reject (slope {{ f(num(h, "pretrend_slope_per_month_pct"), (x) => fmtPct(x, 2)) }} per month, p = {{ f(num(h, "pretrend_slope_p"), fmtP) }}),
      the two placebo dates give {{ f(num(h, "placebo_2024_01_05_pct"), (x) => fmtPct(x, 2)) }} and {{ f(num(h, "placebo_2024_06_30_pct"), (x) => fmtPct(x, 2)) }},
      and the lower-fee yellow-taxi effect ({{ f(num(h, "yellow_pct"), (x) => fmtPct(x, 1)) }}) is larger than the higher-fee ride-hail effect ({{ f(num(h, "fhvhv_pct"), (x) => fmtPct(x, 1)) }}).
    </p>

    <h2>Planted-effect test</h2>
    <p v-if="num(planted, 'bias_pp') !== null" data-testid="planted-result">
      Before any real estimate, the estimator was run on simulated panels built from the real zones and weeks with a known {{ f(num(planted, "planted_effect_pct"), (x) => fmtPct(x, 0)) }} effect planted
      ({{ num(planted, "n_seeds") }} seeds): mean bias {{ f(num(planted, "bias_pp"), (x) => x.toFixed(2)) }} percentage points, the 95% CI covered the planted value in
      {{ num(planted, "coverage") }} of {{ num(planted, "coverage_of") }} seeds. With a planted pre-trend the joint lead test rejected in {{ num(planted, "trend_reject_F") }} of {{ num(planted, "n_seeds") }} seeds,
      but with <em>nothing</em> planted it also rejected in {{ num(planted, "null_reject_F") }} of {{ num(planted, "n_seeds") }} seeds
      (about {{ f(num(sizes, "joint_F"), (x) => (100 * x).toFixed(0)) }}% over {{ num(sizes, "n") }} more seeds): the joint test of 23 leads is over-sized here because only 30 treated zones carry its information.
      The one-degree-of-freedom slope test rejected {{ f(num(sizes, "slope"), (x) => (100 * x).toFixed(0)) }}% of the time under the null.
      What this does not show: the simulation assumes parallel trends and independent zone errors, so it proves the estimator works when the design is right, not that the design is right.
    </p>

    <h2>Post-hoc and spillover checks</h2>
    <ul>
      <li v-if="num(asObject(explo['trend_adjusted']), 'effect_pct') !== null" data-testid="post-hoc-trend">
        Post hoc (added after seeing the pre-trend, not pre-registered): allowing a treated-specific linear trend, the toll coefficient is
        {{ f(num(asObject(explo["trend_adjusted"]), "effect_pct"), (x) => fmtPct(x, 2)) }}. Using only 52 weeks before and 52 weeks after: {{ f(num(asObject(explo["short_window_52_52"]), "effect_pct"), (x) => fmtPct(x, 2)) }}.
        The answer depends on how the pre-trend is treated.
      </li>
      <li v-if="num(asObject(spill['ring_vs_control_b']), 'effect_pct') !== null" data-testid="spillover">
        Spillover: the ring of zones touching the charged area (all of them partly-charged boundary zones) vs control B: {{ f(num(asObject(spill["ring_vs_control_b"]), "effect_pct"), (x) => fmtPct(x, 2)) }};
        the 8 uncharged zones next to the ring vs control B: {{ f(num(asObject(spill["outer_ring_vs_control_b"]), "effect_pct"), (x) => fmtPct(x, 2)) }}.
        Uncharged Manhattan zones near the zone fell about as much as the charged ones, so control A may be contaminated or simply share the trend.
      </li>
    </ul>

    <h2>Reconciliation: every raw row is kept or excluded for a stated reason</h2>
    <template v-if="rec">
      <div class="table-wrap" role="region" aria-label="Reconciliation totals" tabindex="0">
        <table data-testid="reconciliation-table">
          <caption>Totals over {{ rec.totals.nFiles }} files (yellow, green and high-volume FHV, January 2023 to September 2026)</caption>
          <thead>
            <tr>
              <th scope="col" class="num">Raw rows</th><th scope="col" class="num">Kept</th>
              <th scope="col" class="num">Null zone</th><th scope="col" class="num">Unknown zone (264/265)</th>
              <th scope="col" class="num">Outside month</th><th scope="col" class="num">Bad duration</th>
              <th scope="col" class="num">Unexplained</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">{{ fmtNum(rec.totals.raw) }}</td><td class="num">{{ fmtNum(rec.totals.kept) }}</td>
              <td class="num">{{ fmtNum(rec.totals.nullZone) }}</td><td class="num">{{ fmtNum(rec.totals.unknownZone) }}</td>
              <td class="num">{{ fmtNum(rec.totals.outsideMonth) }}</td><td class="num">{{ fmtNum(rec.totals.badDuration) }}</td>
              <td class="num" data-testid="unexplained-total">{{ fmtNum(rec.totals.unexplained) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <details>
        <summary>Per-file reconciliation ({{ rec.files.length }} files)</summary>
        <div class="table-wrap scroll" role="region" aria-label="Per-file reconciliation" tabindex="0">
          <table data-testid="reconciliation-files">
            <caption>Per file</caption>
            <thead>
              <tr>
                <th scope="col">Type</th><th scope="col">Month</th><th scope="col" class="num">Raw</th><th scope="col" class="num">Kept</th>
                <th scope="col" class="num">Null zone</th><th scope="col" class="num">Unknown zone</th><th scope="col" class="num">Outside month</th>
                <th scope="col" class="num">Bad duration</th><th scope="col" class="num">Unexplained</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rec.files" :key="`${r.tripType}-${r.month}`">
                <th scope="row">{{ r.tripType }}</th><td>{{ r.month }}</td>
                <td class="num">{{ fmtNum(r.raw) }}</td><td class="num">{{ fmtNum(r.kept) }}</td>
                <td class="num">{{ fmtNum(r.nullZone) }}</td><td class="num">{{ fmtNum(r.unknownZone) }}</td>
                <td class="num">{{ fmtNum(r.outsideMonth) }}</td><td class="num">{{ fmtNum(r.badDuration) }}</td>
                <td class="num">{{ fmtNum(r.unexplained) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>

    <h2>Sources</h2>
    <ul>
      <li>Trip records: <a href="https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page">NYC Taxi &amp; Limousine Commission trip record data</a> (Parquet files served from d37ci6vzurychx.cloudfront.net), with a sha256 for every file in <code>data/SOURCE.md</code>.</li>
      <li>Zones: TLC <code>taxi_zones.zip</code> (EPSG:2263) and <code>taxi_zone_lookup.csv</code>, from the same page.</li>
      <li>Toll amounts ($0.75 taxis, $1.50 high-volume for-hire): <a href="https://www.mta.info/fares-tolls/tolls/congestion-relief-zone/about">MTA</a>, confirmed against the fee values in the data.</li>
      <li v-if="meta">Panel checksum {{ meta.panelSha256.slice(0, 16) }}…, built at commit {{ meta.commit }}.</li>
    </ul>

    <h2>Limitations</h2>
    <ul data-testid="limitations">
      <li><strong>Other 2025 changes</strong> move in the same period and cannot be separated from the toll: return-to-office policies, changes in app pricing, and the long-running shift of trips between yellow taxis and ride-hail apps.</li>
      <li><strong>Federal action and court rulings.</strong> The US Department of Transportation's letter rescinding the program's approval is dated 19 February 2025; a federal judge blocked it in May 2025 (sources differ on 27 or 28 May) and ruled the federal action unlawful on 3 March 2026
        (<a href="https://www.courthousenews.com/judge-rejects-trump-attempt-to-eliminate-nyc-congestion-pricing/">Courthouse News</a>, <a href="https://www.amny.com/news/expert-analysis-congestion-pricing-survives-federal-challenge-for-now/">amNY</a>). The toll stayed in force throughout; the uncertainty may still have changed behaviour.</li>
      <li><strong>Placebo dates.</strong> The original launch date was 30 June 2024 (<a href="https://www.planetizen.com/news/2024/04/128682-nyc-congestion-pricing-start-june-30-mta-announces">Planetizen</a>); it was paused in June 2024. 5 January 2024 and 30 June 2024 are used as fake start dates.</li>
      <li><strong>Weather</strong> is not modelled. <strong>TLC data revisions</strong> are possible: the file checksums identify the exact bytes used.</li>
      <li><strong>Trips that avoid the zone rather than disappear</strong> (a ride that now ends just outside it) look like a drop inside and a rise outside.</li>
      <li><strong>Unweighted zone averages</strong>: the main estimate treats every zone equally; the weighted specification is one of the eight robustness rows.</li>
      <li><strong>Counts, not people:</strong> trips are not travellers, and private cars, subway and bus are out of scope.</li>
    </ul>
    <p><a href="/memo.pdf" data-testid="memo-link">Read the two-page memo (PDF)</a></p>
  </section>
</template>
