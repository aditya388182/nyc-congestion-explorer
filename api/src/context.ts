import type { Logger } from "pino";
import type { Loaders } from "./loaders/loaders.js";
import type { DataStore } from "./store/dataStore.js";
import type { EstimateService } from "./estimator/estimate.js";

export interface Services {
  data: DataStore;
  estimates: EstimateService;
  logger: Logger;
}

export interface Context extends Services {
  loaders: Loaders;
}
