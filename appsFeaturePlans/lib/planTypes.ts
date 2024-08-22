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
