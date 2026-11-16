/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query Estimate($input: EstimateInput!) {\n  estimate(input: $input) {\n    beta\n    se\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n    cached\n    computeMs\n  }\n}\n\nquery EventStudy($tripType: TripType!, $control: ControlGroup!) {\n  eventStudy(tripType: $tripType, control: $control) {\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    points {\n      month\n      effectPct\n      ciLowPct\n      ciHighPct\n    }\n    leadTest {\n      chi2\n      df\n      pChi2\n      f\n      pF\n      slopePerMonthPct\n      slopeP\n    }\n  }\n}\n\nquery Tables {\n  placebos {\n    start\n    effectPct\n    ciLowPct\n    ciHighPct\n    nWeeks\n    nObs\n  }\n  specs {\n    id\n    label\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n  }\n}\n\nquery ZoneNames {\n  zones {\n    id\n    name\n    group\n  }\n}": typeof types.EstimateDocument,
    "query MapShapes {\n  zones {\n    id\n    name\n    borough\n    group\n    ring\n    geometry\n  }\n}\n\nquery MapChange($tripType: TripType!, $outcome: Outcome!) {\n  zones {\n    id\n    change(tripType: $tripType, outcome: $outcome)\n  }\n}\n\nquery ZoneWeekly($id: Int!, $tripType: TripType!, $outcome: Outcome!) {\n  zone(id: $id) {\n    id\n    name\n    borough\n    group\n    ring\n    change(tripType: $tripType, outcome: $outcome)\n    weekly(tripType: $tripType, outcome: $outcome) {\n      weekStart\n      trips\n    }\n  }\n}": typeof types.MapShapesDocument,
    "query DataMethod {\n  reconciliation {\n    totals {\n      nFiles\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n    files {\n      tripType\n      month\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n  }\n  meta {\n    firstWeek\n    lastWeek\n    nWeeks\n    nZones\n    panelSha256\n    commit\n    generatedAtUtc\n    headline\n    planted\n    spillover\n    exploratory\n  }\n}": typeof types.DataMethodDocument,
};
const documents: Documents = {
    "query Estimate($input: EstimateInput!) {\n  estimate(input: $input) {\n    beta\n    se\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n    cached\n    computeMs\n  }\n}\n\nquery EventStudy($tripType: TripType!, $control: ControlGroup!) {\n  eventStudy(tripType: $tripType, control: $control) {\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    points {\n      month\n      effectPct\n      ciLowPct\n      ciHighPct\n    }\n    leadTest {\n      chi2\n      df\n      pChi2\n      f\n      pF\n      slopePerMonthPct\n      slopeP\n    }\n  }\n}\n\nquery Tables {\n  placebos {\n    start\n    effectPct\n    ciLowPct\n    ciHighPct\n    nWeeks\n    nObs\n  }\n  specs {\n    id\n    label\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n  }\n}\n\nquery ZoneNames {\n  zones {\n    id\n    name\n    group\n  }\n}": types.EstimateDocument,
    "query MapShapes {\n  zones {\n    id\n    name\n    borough\n    group\n    ring\n    geometry\n  }\n}\n\nquery MapChange($tripType: TripType!, $outcome: Outcome!) {\n  zones {\n    id\n    change(tripType: $tripType, outcome: $outcome)\n  }\n}\n\nquery ZoneWeekly($id: Int!, $tripType: TripType!, $outcome: Outcome!) {\n  zone(id: $id) {\n    id\n    name\n    borough\n    group\n    ring\n    change(tripType: $tripType, outcome: $outcome)\n    weekly(tripType: $tripType, outcome: $outcome) {\n      weekStart\n      trips\n    }\n  }\n}": types.MapShapesDocument,
    "query DataMethod {\n  reconciliation {\n    totals {\n      nFiles\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n    files {\n      tripType\n      month\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n  }\n  meta {\n    firstWeek\n    lastWeek\n    nWeeks\n    nZones\n    panelSha256\n    commit\n    generatedAtUtc\n    headline\n    planted\n    spillover\n    exploratory\n  }\n}": types.DataMethodDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query Estimate($input: EstimateInput!) {\n  estimate(input: $input) {\n    beta\n    se\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n    cached\n    computeMs\n  }\n}\n\nquery EventStudy($tripType: TripType!, $control: ControlGroup!) {\n  eventStudy(tripType: $tripType, control: $control) {\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    points {\n      month\n      effectPct\n      ciLowPct\n      ciHighPct\n    }\n    leadTest {\n      chi2\n      df\n      pChi2\n      f\n      pF\n      slopePerMonthPct\n      slopeP\n    }\n  }\n}\n\nquery Tables {\n  placebos {\n    start\n    effectPct\n    ciLowPct\n    ciHighPct\n    nWeeks\n    nObs\n  }\n  specs {\n    id\n    label\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n  }\n}\n\nquery ZoneNames {\n  zones {\n    id\n    name\n    group\n  }\n}"): (typeof documents)["query Estimate($input: EstimateInput!) {\n  estimate(input: $input) {\n    beta\n    se\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n    cached\n    computeMs\n  }\n}\n\nquery EventStudy($tripType: TripType!, $control: ControlGroup!) {\n  eventStudy(tripType: $tripType, control: $control) {\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    points {\n      month\n      effectPct\n      ciLowPct\n      ciHighPct\n    }\n    leadTest {\n      chi2\n      df\n      pChi2\n      f\n      pF\n      slopePerMonthPct\n      slopeP\n    }\n  }\n}\n\nquery Tables {\n  placebos {\n    start\n    effectPct\n    ciLowPct\n    ciHighPct\n    nWeeks\n    nObs\n  }\n  specs {\n    id\n    label\n    effectPct\n    ciLowPct\n    ciHighPct\n    nTreated\n    nControl\n    nWeeks\n    nObs\n    droppedZones\n  }\n}\n\nquery ZoneNames {\n  zones {\n    id\n    name\n    group\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query MapShapes {\n  zones {\n    id\n    name\n    borough\n    group\n    ring\n    geometry\n  }\n}\n\nquery MapChange($tripType: TripType!, $outcome: Outcome!) {\n  zones {\n    id\n    change(tripType: $tripType, outcome: $outcome)\n  }\n}\n\nquery ZoneWeekly($id: Int!, $tripType: TripType!, $outcome: Outcome!) {\n  zone(id: $id) {\n    id\n    name\n    borough\n    group\n    ring\n    change(tripType: $tripType, outcome: $outcome)\n    weekly(tripType: $tripType, outcome: $outcome) {\n      weekStart\n      trips\n    }\n  }\n}"): (typeof documents)["query MapShapes {\n  zones {\n    id\n    name\n    borough\n    group\n    ring\n    geometry\n  }\n}\n\nquery MapChange($tripType: TripType!, $outcome: Outcome!) {\n  zones {\n    id\n    change(tripType: $tripType, outcome: $outcome)\n  }\n}\n\nquery ZoneWeekly($id: Int!, $tripType: TripType!, $outcome: Outcome!) {\n  zone(id: $id) {\n    id\n    name\n    borough\n    group\n    ring\n    change(tripType: $tripType, outcome: $outcome)\n    weekly(tripType: $tripType, outcome: $outcome) {\n      weekStart\n      trips\n    }\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query DataMethod {\n  reconciliation {\n    totals {\n      nFiles\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n    files {\n      tripType\n      month\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n  }\n  meta {\n    firstWeek\n    lastWeek\n    nWeeks\n    nZones\n    panelSha256\n    commit\n    generatedAtUtc\n    headline\n    planted\n    spillover\n    exploratory\n  }\n}"): (typeof documents)["query DataMethod {\n  reconciliation {\n    totals {\n      nFiles\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n    files {\n      tripType\n      month\n      raw\n      kept\n      nullZone\n      unknownZone\n      outsideMonth\n      badDuration\n      unexplained\n    }\n  }\n  meta {\n    firstWeek\n    lastWeek\n    nWeeks\n    nZones\n    panelSha256\n    commit\n    generatedAtUtc\n    headline\n    planted\n    spillover\n    exploratory\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;