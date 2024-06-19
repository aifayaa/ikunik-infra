import { AppsPermWithoutOwnerType } from '../../libs/perms/permEntities';

type OrganizationFieldType = {
  _id: string;
  users: [{ _id: string; roles: Array<AppsPermWithoutOwnerType> }];
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
  stripeSubscriptionId?: string;
};

export type AppInOrgType = AppType & { organization: OrganizationFieldType };
