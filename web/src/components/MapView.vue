<script setup lang="ts">
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { changeToColor } from "../lib/colorScale";

export interface ZoneShape {
  id: number;
  name: string;
  borough: string;
  group: string;
  ring: boolean;
  geometry: unknown;
}

setWorkerUrl(`${location.origin}/maplibre/maplibre-gl-worker.mjs`);

const props = defineProps<{ zones: ZoneShape[]; changes: Map<number, number | null>; showRing: boolean; selectedId: number | null }>();
const emit = defineEmits<{ select: [id: number] }>();

const el = ref<HTMLDivElement | null>(null);
const mapError = ref("");
let map: MapLibreMap | null = null;
const ready = ref(false); // true once the map has finished drawing the zones (the `idle` event)
let layersAdded = false;

function featureCollection(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const z of props.zones) {
    const g = z.geometry as GeoJSON.Geometry;
    if (g.type === "GeometryCollection" && g.geometries.length === 0) continue; // zones without a polygon
    const change = props.changes.get(z.id) ?? null;
    features.push({ type: "Feature", id: z.id, geometry: g, properties: { id: z.id, name: z.name, group: z.group, ring: z.ring, change, color: changeToColor(change) } });
  }
  return { type: "FeatureCollection", features };
}

const drawn = computed(() => featureCollection().features.length);
const coloured = computed(() => featureCollection().features.filter((f) => f.properties?.["change"] !== null).length);

function addLayers(m: MapLibreMap): void {
  m.addSource("zones", { type: "geojson", data: featureCollection(), promoteId: "id" });
  m.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": ["get", "color"], "fill-opacity": 0.95 } });
  m.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": "#ffffff", "line-width": 0.6 } });
  m.addLayer({ id: "zones-ring", type: "line", source: "zones", filter: ["==", ["get", "ring"], true], layout: { visibility: props.showRing ? "visible" : "none" }, paint: { "line-color": "#7c2d12", "line-width": 2.5, "line-dasharray": [2, 1.5] } });
  m.addLayer({ id: "zones-treated", type: "line", source: "zones", filter: ["==", ["get", "group"], "TREATED"], paint: { "line-color": "#111827", "line-width": 1.6 } });
  m.addLayer({ id: "zones-selected", type: "line", source: "zones", filter: ["==", ["get", "id"], props.selectedId ?? -1], paint: { "line-color": "#2563eb", "line-width": 4 } });
}

onMounted(() => {
  if (!el.value) return;
  try {
    map = new MapLibreMap({
      container: el.value,
      style: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#eef2f6" } }] },
      center: [-73.97, 40.72],
      zoom: 9.9,
      attributionControl: false,
    });
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : "The map could not start (WebGL unavailable).";
    return;
  }
  map.addControl(new NavigationControl({ showCompass: false }), "top-left");
  map.on("error", (ev) => {
    mapError.value = ev.error.message;
  });
  map.on("load", () => {
    if (!map) return;
    addLayers(map);
    layersAdded = true;
    if (location.search.includes("e2e")) (window as unknown as Record<string, unknown>)["__congestionMap"] = map;
    map.once("idle", () => {
      ready.value = true;
    });
  });
  map.on("click", "zones-fill", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
    const id = e.features?.[0]?.properties["id"] as number | undefined;
    if (id !== undefined) emit("select", id);
  });
  map.on("mouseenter", "zones-fill", () => {
    if (map) map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "zones-fill", () => {
    if (map) map.getCanvas().style.cursor = "";
  });
});

watch(
  () => [props.zones, props.changes],
  () => {
    if (layersAdded && map) (map.getSource("zones") as GeoJSONSource | undefined)?.setData(featureCollection());
  },
);
watch(
  () => props.showRing,
  (v) => {
    if (layersAdded && map) map.setLayoutProperty("zones-ring", "visibility", v ? "visible" : "none");
  },
);
watch(
  () => props.selectedId,
  (id) => {
    if (layersAdded && map) map.setFilter("zones-selected", ["==", ["get", "id"], id ?? -1]);
  },
);
onBeforeUnmount(() => {
  map?.remove();
  map = null;
});
</script>

<template>
  <div class="map-wrap">
    <div ref="el" class="map" data-testid="map" role="application" aria-label="Map of New York taxi zones coloured by change in trips. Use the zone list above for a keyboard-accessible alternative."></div>
    <p v-if="mapError" class="status error" role="alert">Map problem: {{ mapError }} The zone list above still works.</p>
    <p class="map-status" data-testid="map-status" :data-zones="drawn" :data-coloured="coloured" :data-ready="ready">
      {{ drawn }} zones drawn, {{ coloured }} with a value.
    </p>
  </div>
</template>
