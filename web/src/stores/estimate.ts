import { defineStore } from "pinia";
import { ApiError, runQuery } from "../lib/api";
import { EstimateDocument } from "../graphql/generated/graphql";
import type { ControlGroup, EstimateInput, EstimateQuery, Outcome, TripType } from "../graphql/generated/graphql";

export type EstimateResult = EstimateQuery["estimate"];
export type Status = "idle" | "loading" | "done" | "error";

export const useEstimateStore = defineStore("estimate", {
  state: () => ({
    tripType: "ALL" as TripType,
    control: "AB" as ControlGroup,
    dropBoundary: true,
    outcome: "DROPOFFS" as Outcome,
    excludeZones: [] as number[],
    placeboStart: "" as string,
    status: "idle" as Status,
    result: null as EstimateResult | null,
    errorMessage: "" as string,
    errorCode: "" as string,
    requestId: 0,
  }),
  getters: {
    input(state): EstimateInput {
      return {
        tripType: state.tripType,
        control: state.control,
        dropBoundary: state.dropBoundary,
        outcome: state.outcome,
        excludeZones: state.excludeZones,
        placeboStart: state.placeboStart === "" ? null : state.placeboStart,
      };
    },
    isExcluded: (state) => (id: number) => state.excludeZones.includes(id),
  },
  actions: {
    toggleExclude(id: number): void {
      this.excludeZones = this.excludeZones.includes(id) ? this.excludeZones.filter((z) => z !== id) : [...this.excludeZones, id];
    },
    reset(): void {
      this.excludeZones = [];
      this.placeboStart = "";
    },
    /** Re-estimate with the current controls. Only the latest request may update the state. */
    async run(): Promise<void> {
      const id = ++this.requestId;
      this.status = "loading";
      try {
        const data = await runQuery(EstimateDocument, { input: this.input });
        if (id !== this.requestId) return;
        this.result = data.estimate;
        this.status = "done";
        this.errorMessage = "";
        this.errorCode = "";
      } catch (e) {
        if (id !== this.requestId) return;
        this.status = "error";
        this.errorMessage = e instanceof Error ? e.message : "Unknown error";
        this.errorCode = e instanceof ApiError ? e.code : "UNKNOWN";
      }
    },
  },
});
