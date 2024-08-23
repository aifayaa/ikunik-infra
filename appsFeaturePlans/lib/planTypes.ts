export type FeaturePlanIdType =
  | 'oldFeaturePlanId'
  | 'freeFeaturePlanId'
  | 'proFeaturePlanId'
  | 'entertainmentFeaturePlanId';
export const allPlanTypes: FeaturePlanIdType[] = [
  'oldFeaturePlanId',
  'freeFeaturePlanId',
  'proFeaturePlanId',
  'entertainmentFeaturePlanId',
];

export type FeatureIdType =
  | 'appAnalytics'
  | 'appTabs'
  | 'appTheme'
  | 'appUsers'
  | 'badges'
  | 'chat'
  | 'collaborators'
  | 'community'
  | 'liveStreams'
  | 'playlists'
  | 'polls'
  | 'translations';
export const allFeatureIds: FeatureIdType[] = [
  'appAnalytics',
  'appTabs',
  'appTheme',
  'appUsers',
  'badges',
  'chat',
  'collaborators',
  'community',
  'liveStreams',
  'playlists',
  'polls',
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

export type FeatureAppDataType = {
  softFeatureExceeded?: {
    at: Date;
    lastReminder: Date;
    remindersCount: number;
  };
};

export const PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS =
  1 * 24 * 60 * 60 * 1000;

export type ComputedFeatureSpecificationType =
  | boolean
  | {
      maxCount: number;
      currentUsage: number;
      isSoft?: boolean;
    }
  | {
      maxCount: number;
      currentUsage: number;
      resetPeriod: FeatureResetPeriodType;
      currentPeriod: {
        startDate: string;
        resetDate: string;
      };
      maxDuration?: number;
      resetPeriodWindow?: FeatureResetPeriodWindowType;
      isSoft?: boolean;
    };

export type FeaturePlanType = {
  _id: FeaturePlanIdType;
  tags: string[];
  features: Partial<Record<FeatureIdType, FeatureSpecificationType>>;
};

export type AppFeaturePlanType = {
  _id: FeaturePlanIdType;
  tags?: string[];
  features?: Partial<Record<FeatureIdType, FeatureSpecificationType>>;
  featuresData?: Partial<Record<FeatureIdType, FeatureAppDataType>>;
};

export type ComputedFeaturePlanType = {
  _id: FeaturePlanIdType;
  tags: string[];
  features: Partial<Record<FeatureIdType, ComputedFeatureSpecificationType>>;
  featuresData?: Partial<Record<FeatureIdType, FeatureAppDataType>>;
};
