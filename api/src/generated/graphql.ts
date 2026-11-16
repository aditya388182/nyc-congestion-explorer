import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { ZoneRecord } from '../store/dataStore';
import { Context } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** Arbitrary JSON value (zone geometry, precomputed result blobs). */
  JSON: { input: unknown; output: unknown; }
};

export type ControlGroup =
  | 'A'
  | 'AB'
  | 'B';

export type Estimate = {
  __typename?: 'Estimate';
  beta: Scalars['Float']['output'];
  cached: Scalars['Boolean']['output'];
  ciHighPct: Scalars['Float']['output'];
  ciLowPct: Scalars['Float']['output'];
  computeMs: Scalars['Float']['output'];
  droppedZones: Array<Scalars['Int']['output']>;
  effectPct: Scalars['Float']['output'];
  nControl: Scalars['Int']['output'];
  nObs: Scalars['Int']['output'];
  nTreated: Scalars['Int']['output'];
  nWeeks: Scalars['Int']['output'];
  se: Scalars['Float']['output'];
};

export type EstimateInput = {
  control: ControlGroup;
  dropBoundary: Scalars['Boolean']['input'];
  /** At most 20 zone ids; an unknown id is a BAD_USER_INPUT error. */
  excludeZones?: InputMaybe<Array<Scalars['Int']['input']>>;
  outcome: Outcome;
  /** ISO date before 2025-01-05; uses pre-2025 weeks only; at least 13 weeks on each side. */
  placeboStart?: InputMaybe<Scalars['String']['input']>;
  tripType: TripType;
};

export type EventStudy = {
  __typename?: 'EventStudy';
  control: ControlGroup;
  leadTest: LeadTest;
  nControl: Scalars['Int']['output'];
  nObs: Scalars['Int']['output'];
  nTreated: Scalars['Int']['output'];
  nWeeks: Scalars['Int']['output'];
  points: Array<EventStudyPoint>;
  tripType: TripType;
};

export type EventStudyPoint = {
  __typename?: 'EventStudyPoint';
  ciHighPct: Scalars['Float']['output'];
  ciLowPct: Scalars['Float']['output'];
  coef: Scalars['Float']['output'];
  effectPct: Scalars['Float']['output'];
  month: Scalars['Int']['output'];
  se: Scalars['Float']['output'];
};

export type LeadTest = {
  __typename?: 'LeadTest';
  chi2: Scalars['Float']['output'];
  df: Scalars['Int']['output'];
  f: Scalars['Float']['output'];
  pChi2: Scalars['Float']['output'];
  pF: Scalars['Float']['output'];
  slopeP: Scalars['Float']['output'];
  /** Supplementary 1-df pre-trend slope test (treated relative to control, % per month). */
  slopePerMonthPct: Scalars['Float']['output'];
};

export type Meta = {
  __typename?: 'Meta';
  commit: Scalars['String']['output'];
  exploratory: Scalars['JSON']['output'];
  firstWeek: Scalars['String']['output'];
  generatedAtUtc: Scalars['String']['output'];
  headline: Scalars['JSON']['output'];
  lastWeek: Scalars['String']['output'];
  nWeeks: Scalars['Int']['output'];
  nZones: Scalars['Int']['output'];
  panelSha256: Scalars['String']['output'];
  planted: Scalars['JSON']['output'];
  spillover: Scalars['JSON']['output'];
};

export type Outcome =
  | 'DROPOFFS'
  | 'PICKUPS';

export type Placebo = {
  __typename?: 'Placebo';
  beta: Scalars['Float']['output'];
  ciHighPct: Scalars['Float']['output'];
  ciLowPct: Scalars['Float']['output'];
  effectPct: Scalars['Float']['output'];
  nControl: Scalars['Int']['output'];
  nObs: Scalars['Int']['output'];
  nTreated: Scalars['Int']['output'];
  nWeeks: Scalars['Int']['output'];
  se: Scalars['Float']['output'];
  start: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  estimate: Estimate;
  eventStudy: EventStudy;
  meta: Meta;
  placebos: Array<Placebo>;
  reconciliation: Reconciliation;
  specs: Array<Spec>;
  zone?: Maybe<Zone>;
  zones: Array<Zone>;
};


export type QueryEstimateArgs = {
  input: EstimateInput;
};


export type QueryEventStudyArgs = {
  control: ControlGroup;
  tripType: TripType;
};


export type QueryZoneArgs = {
  id: Scalars['Int']['input'];
};

export type Reconciliation = {
  __typename?: 'Reconciliation';
  files: Array<ReconciliationFile>;
  totals: ReconciliationTotals;
};

export type ReconciliationFile = {
  __typename?: 'ReconciliationFile';
  badDuration: Scalars['Float']['output'];
  kept: Scalars['Float']['output'];
  month: Scalars['String']['output'];
  nullZone: Scalars['Float']['output'];
  outsideMonth: Scalars['Float']['output'];
  raw: Scalars['Float']['output'];
  tripType: Scalars['String']['output'];
  unexplained: Scalars['Float']['output'];
  unknownZone: Scalars['Float']['output'];
};

export type ReconciliationTotals = {
  __typename?: 'ReconciliationTotals';
  badDuration: Scalars['Float']['output'];
  kept: Scalars['Float']['output'];
  nFiles: Scalars['Int']['output'];
  nullZone: Scalars['Float']['output'];
  outsideMonth: Scalars['Float']['output'];
  raw: Scalars['Float']['output'];
  unexplained: Scalars['Float']['output'];
  unknownZone: Scalars['Float']['output'];
};

export type Spec = {
  __typename?: 'Spec';
  beta: Scalars['Float']['output'];
  ciHighPct: Scalars['Float']['output'];
  ciLowPct: Scalars['Float']['output'];
  droppedZones: Array<Scalars['Int']['output']>;
  effectPct: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
  nControl: Scalars['Int']['output'];
  nObs: Scalars['Int']['output'];
  nTreated: Scalars['Int']['output'];
  nWeeks: Scalars['Int']['output'];
  se: Scalars['Float']['output'];
};

export type TripType =
  | 'ALL'
  | 'FHVHV'
  | 'GREEN'
  | 'YELLOW';

export type WeekPoint = {
  __typename?: 'WeekPoint';
  trips: Scalars['Int']['output'];
  weekStart: Scalars['String']['output'];
};

export type Zone = {
  __typename?: 'Zone';
  borough: Scalars['String']['output'];
  /** Percent change: mean weekly trips in the first 52 post weeks vs the same 52 weeks a year earlier. */
  change?: Maybe<Scalars['Float']['output']>;
  geometry: Scalars['JSON']['output'];
  group: ZoneGroup;
  id: Scalars['Int']['output'];
  name: Scalars['String']['output'];
  ring: Scalars['Boolean']['output'];
  weekly: Array<WeekPoint>;
};


export type ZoneChangeArgs = {
  outcome: Outcome;
  tripType: TripType;
};


export type ZoneWeeklyArgs = {
  outcome: Outcome;
  tripType: TripType;
};

export type ZoneGroup =
  | 'BOUNDARY'
  | 'CONTROL_A'
  | 'CONTROL_B'
  | 'OTHER'
  | 'TREATED'
  | 'UNCLASSIFIED';

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  ControlGroup: ControlGroup;
  Estimate: ResolverTypeWrapper<Estimate>;
  EstimateInput: EstimateInput;
  EventStudy: ResolverTypeWrapper<EventStudy>;
  EventStudyPoint: ResolverTypeWrapper<EventStudyPoint>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  LeadTest: ResolverTypeWrapper<LeadTest>;
  Meta: ResolverTypeWrapper<Meta>;
  Outcome: Outcome;
  Placebo: ResolverTypeWrapper<Placebo>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Reconciliation: ResolverTypeWrapper<Reconciliation>;
  ReconciliationFile: ResolverTypeWrapper<ReconciliationFile>;
  ReconciliationTotals: ResolverTypeWrapper<ReconciliationTotals>;
  Spec: ResolverTypeWrapper<Spec>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  TripType: TripType;
  WeekPoint: ResolverTypeWrapper<WeekPoint>;
  Zone: ResolverTypeWrapper<ZoneRecord>;
  ZoneGroup: ZoneGroup;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars['Boolean']['output'];
  Estimate: Estimate;
  EstimateInput: EstimateInput;
  EventStudy: EventStudy;
  EventStudyPoint: EventStudyPoint;
  Float: Scalars['Float']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  LeadTest: LeadTest;
  Meta: Meta;
  Placebo: Placebo;
  Query: Record<PropertyKey, never>;
  Reconciliation: Reconciliation;
  ReconciliationFile: ReconciliationFile;
  ReconciliationTotals: ReconciliationTotals;
  Spec: Spec;
  String: Scalars['String']['output'];
  WeekPoint: WeekPoint;
  Zone: ZoneRecord;
}>;

export type EstimateResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Estimate'] = ResolversParentTypes['Estimate']> = ResolversObject<{
  beta?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  cached?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  ciHighPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ciLowPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  computeMs?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  droppedZones?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  effectPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  nControl?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nObs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nTreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nWeeks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  se?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type EventStudyResolvers<ContextType = Context, ParentType extends ResolversParentTypes['EventStudy'] = ResolversParentTypes['EventStudy']> = ResolversObject<{
  control?: Resolver<ResolversTypes['ControlGroup'], ParentType, ContextType>;
  leadTest?: Resolver<ResolversTypes['LeadTest'], ParentType, ContextType>;
  nControl?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nObs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nTreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nWeeks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  points?: Resolver<Array<ResolversTypes['EventStudyPoint']>, ParentType, ContextType>;
  tripType?: Resolver<ResolversTypes['TripType'], ParentType, ContextType>;
}>;

export type EventStudyPointResolvers<ContextType = Context, ParentType extends ResolversParentTypes['EventStudyPoint'] = ResolversParentTypes['EventStudyPoint']> = ResolversObject<{
  ciHighPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ciLowPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  coef?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  effectPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  month?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  se?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LeadTestResolvers<ContextType = Context, ParentType extends ResolversParentTypes['LeadTest'] = ResolversParentTypes['LeadTest']> = ResolversObject<{
  chi2?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  df?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  f?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pChi2?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  pF?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  slopeP?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  slopePerMonthPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type MetaResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Meta'] = ResolversParentTypes['Meta']> = ResolversObject<{
  commit?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  exploratory?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  firstWeek?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  generatedAtUtc?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  headline?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  lastWeek?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nWeeks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nZones?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  panelSha256?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  planted?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  spillover?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
}>;

export type PlaceboResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Placebo'] = ResolversParentTypes['Placebo']> = ResolversObject<{
  beta?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ciHighPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ciLowPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  effectPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  nControl?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nObs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nTreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nWeeks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  se?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  start?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  estimate?: Resolver<ResolversTypes['Estimate'], ParentType, ContextType, RequireFields<QueryEstimateArgs, 'input'>>;
  eventStudy?: Resolver<ResolversTypes['EventStudy'], ParentType, ContextType, RequireFields<QueryEventStudyArgs, 'control' | 'tripType'>>;
  meta?: Resolver<ResolversTypes['Meta'], ParentType, ContextType>;
  placebos?: Resolver<Array<ResolversTypes['Placebo']>, ParentType, ContextType>;
  reconciliation?: Resolver<ResolversTypes['Reconciliation'], ParentType, ContextType>;
  specs?: Resolver<Array<ResolversTypes['Spec']>, ParentType, ContextType>;
  zone?: Resolver<Maybe<ResolversTypes['Zone']>, ParentType, ContextType, RequireFields<QueryZoneArgs, 'id'>>;
  zones?: Resolver<Array<ResolversTypes['Zone']>, ParentType, ContextType>;
}>;

export type ReconciliationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Reconciliation'] = ResolversParentTypes['Reconciliation']> = ResolversObject<{
  files?: Resolver<Array<ResolversTypes['ReconciliationFile']>, ParentType, ContextType>;
  totals?: Resolver<ResolversTypes['ReconciliationTotals'], ParentType, ContextType>;
}>;

export type ReconciliationFileResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ReconciliationFile'] = ResolversParentTypes['ReconciliationFile']> = ResolversObject<{
  badDuration?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  kept?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  month?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nullZone?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  outsideMonth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  raw?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  tripType?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  unexplained?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unknownZone?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type ReconciliationTotalsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ReconciliationTotals'] = ResolversParentTypes['ReconciliationTotals']> = ResolversObject<{
  badDuration?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  kept?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  nFiles?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nullZone?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  outsideMonth?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  raw?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unexplained?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  unknownZone?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type SpecResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Spec'] = ResolversParentTypes['Spec']> = ResolversObject<{
  beta?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ciHighPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  ciLowPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  droppedZones?: Resolver<Array<ResolversTypes['Int']>, ParentType, ContextType>;
  effectPct?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  nControl?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nObs?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nTreated?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  nWeeks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  se?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
}>;

export type WeekPointResolvers<ContextType = Context, ParentType extends ResolversParentTypes['WeekPoint'] = ResolversParentTypes['WeekPoint']> = ResolversObject<{
  trips?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  weekStart?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ZoneResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Zone'] = ResolversParentTypes['Zone']> = ResolversObject<{
  borough?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  change?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType, RequireFields<ZoneChangeArgs, 'outcome' | 'tripType'>>;
  geometry?: Resolver<ResolversTypes['JSON'], ParentType, ContextType>;
  group?: Resolver<ResolversTypes['ZoneGroup'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  ring?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  weekly?: Resolver<Array<ResolversTypes['WeekPoint']>, ParentType, ContextType, RequireFields<ZoneWeeklyArgs, 'outcome' | 'tripType'>>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  Estimate?: EstimateResolvers<ContextType>;
  EventStudy?: EventStudyResolvers<ContextType>;
  EventStudyPoint?: EventStudyPointResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  LeadTest?: LeadTestResolvers<ContextType>;
  Meta?: MetaResolvers<ContextType>;
  Placebo?: PlaceboResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Reconciliation?: ReconciliationResolvers<ContextType>;
  ReconciliationFile?: ReconciliationFileResolvers<ContextType>;
  ReconciliationTotals?: ReconciliationTotalsResolvers<ContextType>;
  Spec?: SpecResolvers<ContextType>;
  WeekPoint?: WeekPointResolvers<ContextType>;
  Zone?: ZoneResolvers<ContextType>;
}>;

