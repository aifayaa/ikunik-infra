import {
  FeatureAppDataType,
  FeatureIdType,
  FeatureSpecificationType,
} from 'appsFeaturePlans/lib/planTypes';
import { AppsPermWithoutOwnerType } from '../../libs/perms/permEntities';

export type OrganizationFieldUserType = {
  _id: string;
  roles: Array<AppsPermWithoutOwnerType>;
};

type OrganizationFieldType = {
  _id: string;
  users: Array<OrganizationFieldUserType>;
};

export type StripeSubscriptionType = {
  id: string;
  canceledAt?: Date;
  createdAt: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  customer: string;
  endedAt?: Date;
  items: Array<{
    id: string;
    price: {
      id: string;
      currency: string;
      unitAmount: number | null;
    };
  }>;
  latestInvoice: string;
  livemode: boolean;
  nextPendingInvoiceItemInvoice?: Date;
  status: string;
  transferData?: {
    destination: string;
    amountPercent: number | null;
  };
  trialEnd?: Date;
  trialStart?: Date;
  updatedAt?: Date;
};

export type AppType = {
  _id: string;
  key: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  protocol: string;
  settings: {
    press: {
      chatNotificationsEnabled: boolean;
      moderationRequired: boolean;
      env: {
        apiKeyCanBeChanged: boolean;
        appThemeColorPrimary: string;
        articleFromCommunityDateFormat: string;
        articleFromFeedDateFormat: string;
        biometrics: boolean;
        categoryArticleDateFormat: string;
        communityArticleCommentsEnabled: boolean;
        communityArticleDateFormat: string;
        communityArticleShareEnabled: boolean;
        displayArticleAuthor: boolean;
        displayArticleCommentsCount: boolean;
        displayArticleLikesViews: boolean;
        displayPopularCategories: boolean;
        displayTabsNames: boolean;
        feedArticleCommentsEnabled: boolean;
        feedArticleDateFormat: string;
        feedArticleShareEnabled: boolean;
        forgotPasswordEnabled: boolean;
        geolocation: boolean;
        isBeta: boolean;
        keycloakClient: string;
        keycloakRealm: string;
        keycloakUrl: string;
        loginArticleRequired: boolean;
        loginWithUsername: boolean;
        nftLoginEnabled: boolean;
        phoneRegisterEnabled: boolean;
        phoneRegisterRequired: boolean;
        registerWithCrowdaa: boolean;
        reversedFeed: boolean;
        signInWithApple: boolean;
        signInWithCrowdaa: boolean;
        signInWithFacebook: boolean;
        signInWithSAML: boolean;
        startTab: string;
        tabOrder: string;
      };
    };
    iap?: object;
    userDataCollection?: Array<{
      url: string;
      dataMapping: {
        [key: string]: string;
      };
      method?: string;
      headers?: {
        [key: string]: string;
      };
      on?: {
        'saml-login'?: boolean;
        'admin-register'?: boolean;
      };
      jsonataQuery?: string;
      extraRequestFields?: {
        [key: string]: string;
      };
    }>;
    platformApplicationArns?: object;
    myfidbackend?: {
      apiUrl: string;
      apiHeaders: {
        'Ocp-Apim-Subscription-Key': string;
      };
      apiLoginUrl: string;
      apiLoginBody: {
        grant_type: string;
        client_id: string;
        client_secret: string;
        scope: string;
      };
      apiAccessToken: {
        value: string;
        expires: Date;
        tokenType: string;
      };
      accountApiAccessBody: {
        grant_type: string;
        client_id: string;
        client_secret: string;
      };
      accountApiAccessToken: {
        value: string;
        expires: Date;
        tokenType: string;
        accountApiUrl: string;
      };
      resetPasswordApiUrl: string;
    };
    playlistManagementUrl?: string;
  };
  builds: {
    android: {
      name: string;
      packageId: string;
      platform: string;
      repository: string;
      author: string;
      description: string;
      email: string;
      version: string;
      ready: boolean;
      googleApiData?: object;
      firebase?: object;
      pipeline?: {
        _id: string;
        status: string;
        date: string;
      };
    };
    ios: {
      name: string;
      packageId: string;
      platform: string;
      repository: string;
      author: string;
      description: string;
      email: string;
      version: string;
      ready: boolean;
      pipeline?: {
        _id: string;
        status: string;
        date: string;
      };
    };
  };
  backend?: object;
  credentials?: {
    wordpressPlaylists?: {
      baseUrl: string;
      username: string;
      password: string;
      email: string;
      sessionToken: string;
      autoLoginToken: string;
    };
  };
  appleAccounts?: object;
  firebaseProjectId?: object;
  organization?: OrganizationFieldType;
  stripe?: {
    subscription?: StripeSubscriptionType;
  };
  featurePlan?: {
    _id: string;
    startedAt: Date;
    features?: Partial<Record<FeatureIdType, FeatureSpecificationType>>;
    featuresData?: Partial<Record<FeatureIdType, FeatureAppDataType>>;
  };
};

export type AppInOrgType = AppType & { organization: OrganizationFieldType };
