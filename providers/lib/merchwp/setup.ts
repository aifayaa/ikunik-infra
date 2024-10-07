/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import { adminRegister } from 'auth/lib/adminRegister';
import { login } from 'auth/lib/login';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { UserProfileType, UTMType } from '@users/lib/userEntity';
import createApp from '@apps/lib/createApp';
import { AppType } from '@apps/lib/appEntity';
import { WebsiteKubernetesV1Type } from 'websites/lib/websiteTypes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_APPLICATION_CODE,
  MISSING_USER_CODE,
  TEMPLATE_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const { MERCHWP_WEBSITE_TEMPLATES_BUCKET } = process.env as {
  MERCHWP_WEBSITE_TEMPLATES_BUCKET: string;
};

type EnvType = {
  ADMIN_APP: string;
  CROWDAA_REGION: string;
  MERCHWP_API_URL: string;
  MERCHWP_LAMBDA_CREATE_WEBSITE: string;
  STAGE: string;
};

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_WEBSITES, COLL_APPS, COLL_USERS, COLL_PICTURES } =
  mongoCollections;

const {
  ADMIN_APP,
  CROWDAA_REGION,
  MERCHWP_API_URL,
  MERCHWP_LAMBDA_CREATE_WEBSITE,
  STAGE,
} = process.env as EnvType;

export type MerchWPSetupAccountParametersType = {
  email: string;
  username: string;
  password: string;
  profile?: UserProfileType;
  utm?: UTMType;
};

export type MerchWPSetupAppParametersType = {
  name: string;
  color: string;
  iconId: string;
};

export type MerchWPSetupWebsiteParametersType = {
  domains: string[];
  sync: {
    imageId: string;
    imageUrl: string;
  };
  package: string;
  colors: {
    primary: string;
    secondary: string;
  };
  account: {
    email: string;
    password: string;
    userId: string;
    authToken: string;
  };
  app: {
    id: string;
  };
};

export async function setupAccount(account: MerchWPSetupAccountParametersType) {
  const client = await MongoClient.connect();
  try {
    // Try to login or register
    let loginResults = null;
    try {
      loginResults = await login(
        account.email,
        account.username,
        account.password,
        ADMIN_APP
      );
    } catch (e) {
      loginResults = await adminRegister({
        email: account.email,
        username: account.username,
        password: account.password,
        profile: account.profile || { username: account.username },
        utm: account.utm || {},
      });
    }

    return loginResults as {
      userId: string;
      authToken: string;
    };
  } finally {
    await client.close();
  }
}

export async function setupApp(
  app: MerchWPSetupAppParametersType,
  userId: string
) {
  const client = await MongoClient.connect();
  try {
    let dbApp = (await client
      .db()
      .collection(COLL_APPS)
      .findOne({ name: app.name, createdBy: userId })) as AppType;

    const picture = await client
      .db()
      .collection(COLL_PICTURES)
      .findOne({ _id: app.iconId });

    if (!dbApp) {
      dbApp = (await createApp(app.name, userId, {
        themeColorPrimary: app.color,
        iconId: app.iconId,
      })) as AppType;
    } else {
      if (picture) {
        const haveUrl =
          picture.thumbUrl ||
          picture.mediumUrl ||
          picture.largeUrl ||
          picture.pictureUrl;
        if (haveUrl) {
          await client
            .db()
            .collection(COLL_APPS)
            .updateOne(
              { _id: dbApp._id },
              {
                $set: {
                  'icon._id': app.iconId,
                  'icon.thumbUrl': picture.thumbUrl,
                  'icon.mediumUrl': picture.mediumUrl,
                  'icon.largeUrl': picture.largeUrl,
                  'icon.pictureUrl': picture.pictureUrl,
                },
              }
            );
        }

        await client
          .db()
          .collection(COLL_PICTURES)
          .updateOne({ _id: app.iconId }, { $set: { appId: dbApp._id } });
      }
    }

    return dbApp;
  } finally {
    await client.close();
  }
}

export async function setupWebsite(website: MerchWPSetupWebsiteParametersType) {
  const client = await MongoClient.connect();
  try {
    let objAttrs = null;
    const bucketKey = `merchwp/${website.package}.zip`;
    try {
      objAttrs = await s3
        .getObjectAttributes({
          Bucket: MERCHWP_WEBSITE_TEMPLATES_BUCKET,
          Key: bucketKey,
          ObjectAttributes: ['ObjectSize'],
        })
        .promise();
    } catch (e) {
      /* Ignored */
    }

    if (!objAttrs) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        TEMPLATE_NOT_FOUND_CODE,
        `Template ${website.package} not found`
      );
    }

    const dbUser = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: website.account.userId, appId: ADMIN_APP });
    if (!dbUser) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_USER_CODE,
        'Invalid userId provided'
      );
    }
    const dbApp = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: website.app.id, createdBy: website.account.userId });
    if (!dbApp) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        'Invalid appId provided'
      );
    }

    const dbPicture = await client
      .db()
      .collection(COLL_PICTURES)
      .findOne({ _id: website.sync.imageId, appId: website.app.id });
    if (!dbPicture) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        'Invalid appId provided'
      );
    }

    const websiteId = `merch${new ObjectID().toString()}`;

    const defaultDomain = `ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const defaultUrl = `https://ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const domains = [defaultDomain, ...website.domains];

    const dbWebsite = {
      _id: websiteId,
      createdAt: new Date(),
      createdBy: website.account.userId,
      type: 'kubernetes/v1',
      name: defaultDomain,
      domains: domains,
      appId: website.app.id,
    } as WebsiteKubernetesV1Type;
    await client.db().collection(COLL_WEBSITES).insertOne(dbWebsite);

    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: website.app.id },
        {
          $set: {
            backend: {
              type: 'wordpress',
              url: `${defaultUrl}/wp-json`,
              apiKey: 'invalid', // Set later by the website creation itself (setup.sh inside template)
            },
            'public.autoLoginDomains': domains,
            'public.defaultUrl': `${defaultUrl}/`,

            'settings.press.env.merchWPUrl': `${defaultUrl}/`,
            'settings.press.env.tabOrder':
              'today,categories,merchwp,community,search,settings',

            featurePlan: {
              _id: 'legacyFeaturePlanId',
              startedAt: new Date(),
            },
          },
        }
      );

    await lambda
      .invokeAsync({
        FunctionName: MERCHWP_LAMBDA_CREATE_WEBSITE,
        InvokeArgs: JSON.stringify({
          initTemplate: `merchwp/${website.package}.zip`,
          websiteId,
          domains: website.domains,
          wordpress: {
            adminLogin: website.account.email,
            adminPassword: website.account.password,
          },
          // Automatic, no DB setup
          // database: { host: '', port: 3306, name: '', user: '', password: '' },
          container: {
            environmentVariables: {
              API_URL: MERCHWP_API_URL,
              LOGIN_APP_ID: ADMIN_APP,
              APP_ID: website.app.id,
              SYNC_IMAGE_ID: website.sync.imageId,
              SYNC_IMAGE_URL: website.sync.imageUrl,
              PRIMARY_COLOR: website.colors.primary,
              SECONDARY_COLOR: website.colors.secondary,
            },
            environmentSecretVariables: {
              ADMIN_USER_ID: website.account.userId,
              ADMIN_LOGIN: website.account.email,
              ADMIN_SESSION: website.account.authToken,
            },
            crowdaaHostingImage: 'php',
            tag: '8.2-apache',
          },
        }),
      })
      .promise();

    return dbWebsite;
  } finally {
    await client.close();
  }
}
