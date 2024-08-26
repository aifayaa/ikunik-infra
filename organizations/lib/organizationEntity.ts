import {
  FeatureAppDataType,
  FeatureIdType,
} from 'appsFeaturePlans/lib/planTypes';

export type OrganizationType = {
  _id: string;
  name: string;
  email: string;
  apple: {
    setupDone: boolean;
    teamId?: string;
    teamStatus?: string;
    companyName?: string;
  };
  createdAt: Date;
  createdBy: string;
  stripeCustomerId: string;
  defaultFeaturePlan?: {
    _id: string;
    featuresData?: Partial<Record<FeatureIdType, FeatureAppDataType>>;
  };
};
