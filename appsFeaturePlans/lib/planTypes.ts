export type FeaturePlanIdType =
  | 'legacyFeaturePlanId'
  | 'freeFeaturePlanId'
  | 'proFeaturePlanId'
  | 'entertainmentFeaturePlanId'
  | 'devTestFeaturePlanId';
export const allPlanTypes: FeaturePlanIdType[] = [
  'legacyFeaturePlanId',
  'freeFeaturePlanId',
  'proFeaturePlanId',
  'entertainmentFeaturePlanId',
  'devTestFeaturePlanId',
];

export type FeatureIdType =
  | 'activeUsers'
  | 'appTabs'
  | 'appTheme'
  | 'badges'
  | 'chat'
  | 'crowd'
  | 'leaderboardWp'
  | 'liveStreamDuration'
  | 'liveStreams'
  | 'playlists'
  | 'polls'
  | 'iapPolls'
  | 'translations';
export const allFeatureIds: FeatureIdType[] = [
  'activeUsers',
  'appTabs',
  'appTheme',
  'badges',
  'chat',
  'crowd',
  'leaderboardWp',
  'liveStreamDuration',
  'liveStreams',
  'playlists',
  'polls',
  'iapPolls',
  'translations',
];

export type FeatureResetPeriodType = 'week' | 'month' | 'year';
export const allFeatureResetPeriod: FeatureResetPeriodType[] = [
  'week',
  'month',
  'year',
];

export type FeatureResetPeriodWindowType = 'rolling' | 'fixed';
export const allFeatureResetPeriodWindow: FeatureResetPeriodWindowType[] = [
  'rolling',
  'fixed',
];

export type FeatureSpecificationType =
  | boolean
  | {
      maxCount: number;
      maxDuration?: number;
      resetPeriod?: FeatureResetPeriodType;
      resetPeriodWindow?: FeatureResetPeriodWindowType;
      isSoft?: boolean;
    };

export type FeatureExceededType = {
  at: Date;
  lastReminder: Date;
  remindersCount: number;
};

export type FeatureAppDataType = {
  featureExceeded?: FeatureExceededType;
};

export const PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS =
  1 * 24 * 60 * 60 * 1000;

export type ComputedFeatureSpecification0Type = boolean;
export type ComputedFeatureSpecification1Type = {
  maxCount: number;
  currentUsage: number;
  isSoft?: boolean;
};
export type ComputedFeatureSpecification2Type = {
  maxCount: number;
  currentUsage: number;
  resetPeriod: FeatureResetPeriodType;
  currentPeriod: {
    startDate: Date;
    resetDate: Date;
  };
  maxDuration?: number;
  resetPeriodWindow?: FeatureResetPeriodWindowType;
  isSoft?: boolean;
};

export type ComputedFeatureSpecificationType =
  | ComputedFeatureSpecification0Type
  | ComputedFeatureSpecification1Type
  | ComputedFeatureSpecification2Type;

type PlanLocalizedNameType = Record<string, string>;

export type FeaturePlanType = {
  _id: FeaturePlanIdType;
  tags: string[];
  name: PlanLocalizedNameType;
  features: Partial<Record<FeatureIdType, FeatureSpecificationType>>;
};

export type AppFeaturePlanType = {
  _id: FeaturePlanIdType;
  tags?: string[];
  name?: PlanLocalizedNameType;
  features?: Partial<Record<FeatureIdType, FeatureSpecificationType>>;
  featuresData?: Partial<Record<FeatureIdType, FeatureAppDataType>>;
  startedAt?: Date;
};

export type ComputedFeaturePlanType = {
  _id: FeaturePlanIdType;
  tags: string[];
  name: PlanLocalizedNameType;
  features: Partial<Record<FeatureIdType, ComputedFeatureSpecificationType>>;
  featuresData?: Partial<Record<FeatureIdType, FeatureAppDataType>>;
  startedAt?: Date;
};
