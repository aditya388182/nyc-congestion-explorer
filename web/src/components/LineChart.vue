<script setup lang="ts">
/** The one Chart.js wrapper: a line chart with optional vertical marker and shaded band. */
import { Chart, Filler, Legend, LineController, LineElement, LinearScale, PointElement, CategoryScale, Tooltip } from "chart.js";
import type { ChartConfiguration, Plugin } from "chart.js";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

export interface Series {
  label: string;
  data: (number | null)[];
  color: string;
  /** draw as a band edge (no points); `fillTo` is the dataset offset (e.g. "-1") to shade to */
  band?: boolean;
  fillTo?: string;
  dashed?: boolean;
}

const props = defineProps<{
  labels: string[];
  series: Series[];
  yTitle: string;
  xTitle?: string;
  description: string;
  markerLabel?: string;
  markerIndex?: number | null;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart | null = null;

const marker: Plugin<"line"> = {
  id: "marker",
  afterDatasetsDraw(c) {
    const idx = props.markerIndex;
    if (idx === null || idx === undefined || idx < 0) return;
    const x = c.scales["x"]?.getPixelForValue(idx);
    if (x === undefined) return;
    const { top, bottom } = c.chartArea;
    const ctx = c.ctx;
    ctx.save();
    ctx.strokeStyle = "#b42318";
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    if (props.markerLabel) {
      ctx.setLineDash([]);
      ctx.fillStyle = "#b42318";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(props.markerLabel, x + 4, top + 12);
    }
    ctx.restore();
  },
};

function config(): ChartConfiguration<"line"> {
  return {
    type: "line",
    data: {
      labels: props.labels,
      datasets: props.series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.band ? "transparent" : s.color,
        backgroundColor: s.band ? `${s.color}33` : s.color,
        pointRadius: s.band ? 0 : 2,
        borderWidth: s.band ? 0 : 2,
        borderDash: s.dashed ? [6, 4] : [],
        fill: s.fillTo ?? false,
        spanGaps: true,
        tension: 0,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true, labels: { filter: (item) => item.text !== "" } }, tooltip: { enabled: true } },
      scales: {
        x: { title: { display: Boolean(props.xTitle), text: props.xTitle ?? "" }, ticks: { maxTicksLimit: 10, autoSkip: true } },
        y: { title: { display: true, text: props.yTitle } },
      },
    },
    plugins: [marker],
  };
}

onMounted(() => {
  if (canvas.value) chart = new Chart(canvas.value, config());
});
watch(
  () => [props.labels, props.series, props.markerIndex],
  () => {
    if (!chart) return;
    const c = config();
    chart.data = c.data;
    chart.update();
  },
  { deep: true },
);
onBeforeUnmount(() => {
  chart?.destroy();
  chart = null;
});
</script>

<template>
  <div class="chart-box">
    <canvas ref="canvas" role="img" :aria-label="description"></canvas>
  </div>
</template>

<style scoped>
.chart-box {
  position: relative;
  height: 280px;
  width: 100%;
}
</style>
