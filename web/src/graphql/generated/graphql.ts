/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ControlGroup =
  | 'A'
  | 'AB'
  | 'B';

export type EstimateInput = {
  control: ControlGroup;
  dropBoundary: boolean;
  /** At most 20 zone ids; an unknown id is a BAD_USER_INPUT error. */
  excludeZones?: Array<number> | null | undefined;
  outcome: Outcome;
  /** ISO date before 2025-01-05; uses pre-2025 weeks only; at least 13 weeks on each side. */
  placeboStart?: string | null | undefined;
  tripType: TripType;
};

export type Outcome =
  | 'DROPOFFS'
  | 'PICKUPS';

export type TripType =
  | 'ALL'
  | 'FHVHV'
  | 'GREEN'
  | 'YELLOW';

export type ZoneGroup =
  | 'BOUNDARY'
  | 'CONTROL_A'
  | 'CONTROL_B'
  | 'OTHER'
  | 'TREATED'
  | 'UNCLASSIFIED';

export type EstimateQueryVariables = Exact<{
  input: EstimateInput;
}>;


export type EstimateQuery = { estimate: { beta: number, se: number, effectPct: number, ciLowPct: number, ciHighPct: number, nTreated: number, nControl: number, nWeeks: number, nObs: number, droppedZones: Array<number>, cached: boolean, computeMs: number } };

export type EventStudyQueryVariables = Exact<{
  tripType: TripType;
  control: ControlGroup;
}>;


export type EventStudyQuery = { eventStudy: { nTreated: number, nControl: number, nWeeks: number, nObs: number, points: Array<{ month: number, effectPct: number, ciLowPct: number, ciHighPct: number }>, leadTest: { chi2: number, df: number, pChi2: number, f: number, pF: number, slopePerMonthPct: number, slopeP: number } } };

export type TablesQueryVariables = Exact<{ [key: string]: never; }>;


export type TablesQuery = { placebos: Array<{ start: string, effectPct: number, ciLowPct: number, ciHighPct: number, nWeeks: number, nObs: number }>, specs: Array<{ id: string, label: string, effectPct: number, ciLowPct: number, ciHighPct: number, nTreated: number, nControl: number, nWeeks: number, nObs: number, droppedZones: Array<number> }> };

export type ZoneNamesQueryVariables = Exact<{ [key: string]: never; }>;


export type ZoneNamesQuery = { zones: Array<{ id: number, name: string, group: ZoneGroup }> };

export type MapShapesQueryVariables = Exact<{ [key: string]: never; }>;


export type MapShapesQuery = { zones: Array<{ id: number, name: string, borough: string, group: ZoneGroup, ring: boolean, geometry: unknown }> };

export type MapChangeQueryVariables = Exact<{
  tripType: TripType;
  outcome: Outcome;
}>;


export type MapChangeQuery = { zones: Array<{ id: number, change: number | null }> };

export type ZoneWeeklyQueryVariables = Exact<{
  id: number;
  tripType: TripType;
  outcome: Outcome;
}>;


export type ZoneWeeklyQuery = { zone: { id: number, name: string, borough: string, group: ZoneGroup, ring: boolean, change: number | null, weekly: Array<{ weekStart: string, trips: number }> } | null };

export type DataMethodQueryVariables = Exact<{ [key: string]: never; }>;


export type DataMethodQuery = { reconciliation: { totals: { nFiles: number, raw: number, kept: number, nullZone: number, unknownZone: number, outsideMonth: number, badDuration: number, unexplained: number }, files: Array<{ tripType: string, month: string, raw: number, kept: number, nullZone: number, unknownZone: number, outsideMonth: number, badDuration: number, unexplained: number }> }, meta: { firstWeek: string, lastWeek: string, nWeeks: number, nZones: number, panelSha256: string, commit: string, generatedAtUtc: string, headline: unknown, planted: unknown, spillover: unknown, exploratory: unknown } };


export const EstimateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Estimate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EstimateInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"estimate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beta"}},{"kind":"Field","name":{"kind":"Name","value":"se"}},{"kind":"Field","name":{"kind":"Name","value":"effectPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciLowPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciHighPct"}},{"kind":"Field","name":{"kind":"Name","value":"nTreated"}},{"kind":"Field","name":{"kind":"Name","value":"nControl"}},{"kind":"Field","name":{"kind":"Name","value":"nWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"nObs"}},{"kind":"Field","name":{"kind":"Name","value":"droppedZones"}},{"kind":"Field","name":{"kind":"Name","value":"cached"}},{"kind":"Field","name":{"kind":"Name","value":"computeMs"}}]}}]}}]} as unknown as DocumentNode<EstimateQuery, EstimateQueryVariables>;
export const EventStudyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EventStudy"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TripType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"control"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ControlGroup"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"eventStudy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tripType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}}},{"kind":"Argument","name":{"kind":"Name","value":"control"},"value":{"kind":"Variable","name":{"kind":"Name","value":"control"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nTreated"}},{"kind":"Field","name":{"kind":"Name","value":"nControl"}},{"kind":"Field","name":{"kind":"Name","value":"nWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"nObs"}},{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"effectPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciLowPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciHighPct"}}]}},{"kind":"Field","name":{"kind":"Name","value":"leadTest"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chi2"}},{"kind":"Field","name":{"kind":"Name","value":"df"}},{"kind":"Field","name":{"kind":"Name","value":"pChi2"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"pF"}},{"kind":"Field","name":{"kind":"Name","value":"slopePerMonthPct"}},{"kind":"Field","name":{"kind":"Name","value":"slopeP"}}]}}]}}]}}]} as unknown as DocumentNode<EventStudyQuery, EventStudyQueryVariables>;
export const TablesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Tables"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"placebos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"start"}},{"kind":"Field","name":{"kind":"Name","value":"effectPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciLowPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciHighPct"}},{"kind":"Field","name":{"kind":"Name","value":"nWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"nObs"}}]}},{"kind":"Field","name":{"kind":"Name","value":"specs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"effectPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciLowPct"}},{"kind":"Field","name":{"kind":"Name","value":"ciHighPct"}},{"kind":"Field","name":{"kind":"Name","value":"nTreated"}},{"kind":"Field","name":{"kind":"Name","value":"nControl"}},{"kind":"Field","name":{"kind":"Name","value":"nWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"nObs"}},{"kind":"Field","name":{"kind":"Name","value":"droppedZones"}}]}}]}}]} as unknown as DocumentNode<TablesQuery, TablesQueryVariables>;
export const ZoneNamesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZoneNames"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"group"}}]}}]}}]} as unknown as DocumentNode<ZoneNamesQuery, ZoneNamesQueryVariables>;
export const MapShapesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MapShapes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"borough"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"ring"}},{"kind":"Field","name":{"kind":"Name","value":"geometry"}}]}}]}}]} as unknown as DocumentNode<MapShapesQuery, MapShapesQueryVariables>;
export const MapChangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MapChange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TripType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"outcome"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Outcome"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zones"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"change"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tripType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}}},{"kind":"Argument","name":{"kind":"Name","value":"outcome"},"value":{"kind":"Variable","name":{"kind":"Name","value":"outcome"}}}]}]}}]}}]} as unknown as DocumentNode<MapChangeQuery, MapChangeQueryVariables>;
export const ZoneWeeklyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ZoneWeekly"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"TripType"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"outcome"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Outcome"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"zone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"borough"}},{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"ring"}},{"kind":"Field","name":{"kind":"Name","value":"change"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tripType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}}},{"kind":"Argument","name":{"kind":"Name","value":"outcome"},"value":{"kind":"Variable","name":{"kind":"Name","value":"outcome"}}}]},{"kind":"Field","name":{"kind":"Name","value":"weekly"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"tripType"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tripType"}}},{"kind":"Argument","name":{"kind":"Name","value":"outcome"},"value":{"kind":"Variable","name":{"kind":"Name","value":"outcome"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"weekStart"}},{"kind":"Field","name":{"kind":"Name","value":"trips"}}]}}]}}]}}]} as unknown as DocumentNode<ZoneWeeklyQuery, ZoneWeeklyQueryVariables>;
export const DataMethodDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DataMethod"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reconciliation"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totals"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nFiles"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"kept"}},{"kind":"Field","name":{"kind":"Name","value":"nullZone"}},{"kind":"Field","name":{"kind":"Name","value":"unknownZone"}},{"kind":"Field","name":{"kind":"Name","value":"outsideMonth"}},{"kind":"Field","name":{"kind":"Name","value":"badDuration"}},{"kind":"Field","name":{"kind":"Name","value":"unexplained"}}]}},{"kind":"Field","name":{"kind":"Name","value":"files"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tripType"}},{"kind":"Field","name":{"kind":"Name","value":"month"}},{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"kept"}},{"kind":"Field","name":{"kind":"Name","value":"nullZone"}},{"kind":"Field","name":{"kind":"Name","value":"unknownZone"}},{"kind":"Field","name":{"kind":"Name","value":"outsideMonth"}},{"kind":"Field","name":{"kind":"Name","value":"badDuration"}},{"kind":"Field","name":{"kind":"Name","value":"unexplained"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"meta"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstWeek"}},{"kind":"Field","name":{"kind":"Name","value":"lastWeek"}},{"kind":"Field","name":{"kind":"Name","value":"nWeeks"}},{"kind":"Field","name":{"kind":"Name","value":"nZones"}},{"kind":"Field","name":{"kind":"Name","value":"panelSha256"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAtUtc"}},{"kind":"Field","name":{"kind":"Name","value":"headline"}},{"kind":"Field","name":{"kind":"Name","value":"planted"}},{"kind":"Field","name":{"kind":"Name","value":"spillover"}},{"kind":"Field","name":{"kind":"Name","value":"exploratory"}}]}}]}}]} as unknown as DocumentNode<DataMethodQuery, DataMethodQueryVariables>;