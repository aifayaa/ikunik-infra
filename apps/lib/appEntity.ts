import { AppsPermWithoutOwnerType } from '../../libs/perms/permEntities';

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
    iap?: Object;
    userDataCollection?: Object;
    platformApplicationArns?: Object;
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
      googleApiData?: Object;
      firebase?: Object;
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
    };
  };
  backend?: Object;
  credentials?: Object;
  appleAccounts?: Object;
  firebaseProjectId?: Object;
  organization?: {
    _id: string;
    users: [{ _id: string; roles: Array<AppsPermWithoutOwnerType> }];
  };
  stripeSubscriptionId?: string;
};
