/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import { OrganizationType } from '@organizations/lib/organizationEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getUserOrgs from '../../organizations/lib/getUserOrgs';
import getUserApps from '../../apps/lib/getUserApps';
import { AppType } from '@apps/lib/appEntity';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { S3_APPS_RESSOURCES } = process.env as { S3_APPS_RESSOURCES: string };

const {
  COLL_ORGANIZATIONS,
  COLL_PRESS_ARTICLES,
  COLL_PRESS_CATEGORIES,
  COLL_TOS,
  COLL_PIPELINES,
} = mongoCollections;

export type OnboardingReturnType = {
  firstOrg?: boolean;
  firstApp?: boolean;
  firstCategory?: boolean;
  firstArticle?: boolean;
  firstTos?: boolean;
  assets?: boolean;
  appleTeamId?: boolean;
  firstBuild?: boolean;
};

const RESOURCES_LIST = {
  ios: ['ios/icon.png', 'ios/splash.png'],
  android: ['android/icon.png', 'android/splash.png'],
} as const;

/*
- Créer une organisation firstOrg (user)
- Créer une application firstApp (org)
- Créer  une catégorie firstCategory (app)
- Créer un article firstArticle (app)
- Créer des TOS firstTos (app)
- Uploader les assets (icon splash) iosAssets & androidAssets (app)
- Insérer le TeamID appleTeamId (org)
- Lancer un 1er build firstBuild (app)
 */

type GetOnboardingForParamType = {
  appId?: string;
  orgId?: string;
};

async function checkAppAssets(appId: string) {
  const platforms = Object.keys(
    RESOURCES_LIST
  ) as (keyof typeof RESOURCES_LIST)[];

  const promises = platforms.map(async (platform) => {
    const resources = RESOURCES_LIST[platform];
    const promises2 = resources.map(async (path) => {
      let objAttrs = null;
      try {
        objAttrs = await s3
          .getObjectAttributes({
            Bucket: S3_APPS_RESSOURCES,
            Key: `${appId}/${path}`,
            ObjectAttributes: ['ObjectSize'],
          })
          .promise();
      } catch (e) {
        /* Do nothing */
      }

      return !!objAttrs;
    });

    const results2 = await Promise.all(promises2);
    const allValid = results2.reduce((acc, ok) => acc && ok, true);

    return allValid;
  });
  const results = await Promise.all(promises);
  const anyValid = results.reduce((acc, ok) => acc || ok, false);

  return anyValid;
}

export async function getOnboardingFor(
  userId: string,
  { appId, orgId }: GetOnboardingForParamType = {}
) {
  const client = await MongoClient.connect();
  const db = client.db();
  const onboarding: OnboardingReturnType = {};

  try {
    const orgs = (await getUserOrgs(userId)) as OrganizationType[];
    const apps = (await getUserApps(userId)) as AppType[];

    onboarding.firstOrg = orgs.length > 0;

    if (orgId) {
      onboarding.appleTeamId = false;
      onboarding.firstApp = false;
      const userOrg = orgs.find((org) => org._id === orgId);
      if (userOrg) {
        onboarding.appleTeamId = !!userOrg.apple.teamId;
        const orgApp = apps.find(
          (app) => app.organization && app.organization._id === orgId
        );

        onboarding.firstApp = !!orgApp;
      }
    }

    if (appId) {
      const userApp = apps.find((app) => app._id === appId);

      if (userApp) {
        onboarding.firstApp = true;

        if (userApp.organization?._id) {
          const org = await db
            .collection(COLL_ORGANIZATIONS)
            .findOne({ _id: userApp.organization._id });

          if (org) {
            onboarding.appleTeamId = !!org.apple.teamId;
          }
        }

        const article = await db
          .collection(COLL_PRESS_ARTICLES)
          .findOne({ appId });
        const category = await db
          .collection(COLL_PRESS_CATEGORIES)
          .findOne({ appId });
        const tos = await db.collection(COLL_TOS).findOne({ appId });
        const pipeline = await db.collection(COLL_PIPELINES).findOne({
          appId,
          $or: [{ type: 'build-ios' }, { type: 'build-android' }],
        });

        onboarding.firstCategory = !!category;
        onboarding.firstArticle = !!article;
        onboarding.firstTos = !!tos;
        onboarding.firstBuild = !!pipeline;
        onboarding.assets = await checkAppAssets(appId);
      }
    }

    return onboarding;
  } finally {
    await client.close();
  }
}
