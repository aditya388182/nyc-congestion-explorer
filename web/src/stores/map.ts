import { defineStore } from "pinia";

export type TripTypeValue = "YELLOW" | "GREEN" | "FHVHV" | "ALL";
export type OutcomeValue = "DROPOFFS" | "PICKUPS";

export const useMapStore = defineStore("map", {
  state: () => ({
    tripType: "ALL" as TripTypeValue,
    outcome: "DROPOFFS" as OutcomeValue,
    showRing: false,
    selectedZoneId: null as number | null,
  }),
  actions: {
    select(id: number | null): void {
      this.selectedZoneId = id;
    },
  },
});
