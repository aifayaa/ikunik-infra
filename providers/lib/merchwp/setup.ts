/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import { adminRegister } from 'auth/lib/adminRegister';
import { login } from 'auth/lib/login';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import Random from '@libs/account_utils/random';
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

const rdsDataService = new AWS.RDSDataService();

const {
  MERCHWP_WEBSITE_TEMPLATES_BUCKET,
  WEBSITES_DATABASE_ARN,
  WEBSITES_DATABASE_CREDENTIALS_ARN,
  WEBSITES_DATABASE_EXISTS,
  WEBSITES_DATABASE_HOST,
} = process.env as {
  MERCHWP_WEBSITE_TEMPLATES_BUCKET: string;
  WEBSITES_DATABASE_ARN: string;
  WEBSITES_DATABASE_CREDENTIALS_ARN: string;
  WEBSITES_DATABASE_EXISTS: string;
  WEBSITES_DATABASE_HOST: string;
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

function timestamp() {
  return Math.floor(Date.now() / 1000);
}

async function setupDatabase() {
  const now = timestamp();
  const rand = Random.id(5);
  const name = `db${now}x${rand}`;
  const user = `user${now}x${rand}`;
  const password = Random.id(31);

  const sqlQueries = [
    `CREATE DATABASE IF NOT EXISTS ${name}`,
    `CREATE USER '${user}'@'%' IDENTIFIED BY '${password}'`,
    `GRANT
      SELECT, INSERT, UPDATE, DELETE,
      CREATE, ALTER, DROP,
      INDEX,
      LOCK TABLES, REFERENCES, CREATE TEMPORARY TABLES, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, EXECUTE, ALTER ROUTINE
    ON \`${name}\`.* TO '${user}'@'%' WITH GRANT OPTION`,
  ];

  for (let i = 0; i < sqlQueries.length; i++) {
    await rdsDataService
      .executeStatement({
        resourceArn: WEBSITES_DATABASE_ARN,
        secretArn: WEBSITES_DATABASE_CREDENTIALS_ARN,
        sql: sqlQueries[i],
      })
      .promise();
  }

  return {
    host: WEBSITES_DATABASE_HOST,
    port: 3306,
    name,
    password,
    user,
  };
}

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
    authToken: string;
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

    if (!dbApp) {
      dbApp = (await createApp(app.name, userId, {
        themeColorPrimary: app.color,
      })) as AppType;
    }

    return dbApp;
  } finally {
    await client.close();
  }
}

export async function setAppIcon(appId: string, iconId: string) {
  const client = await MongoClient.connect();
  try {
    const picture = await client
      .db()
      .collection(COLL_PICTURES)
      .findOne({ _id: iconId });

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
            { _id: appId },
            {
              $set: {
                'icon._id': iconId,
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
        .updateOne({ _id: iconId }, { $set: { appId } });

      return { set: true };
    }

    return { set: false };
  } finally {
    await client.close();
  }
}

export async function setupWebsite(
  userId: string,
  appId: string,
  website: MerchWPSetupWebsiteParametersType
) {
  const client = await MongoClient.connect();
  try {
    const bucketKey = `merchwp/${website.package.replace(/[^a-z0-9.+_:-]/gi, '')}.zip`;
    let objAttrs = null;
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
      .findOne({ _id: userId, appId: ADMIN_APP });
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
      .findOne({ _id: appId, createdBy: userId });
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
      .findOne({ _id: website.sync.imageId, appId: appId });
    if (!dbPicture) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        'Invalid appId provided'
      );
    }

    let database = null;
    if (WEBSITES_DATABASE_EXISTS === 'yes') {
      database = await setupDatabase();
    }

    const websiteId = `merchwp${new ObjectID().toString()}`;

    const defaultDomain = `ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const defaultUrl = `https://ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const domains = [defaultDomain, ...website.domains];

    const dbWebsite: WebsiteKubernetesV1Type = {
      _id: websiteId,
      createdAt: new Date(),
      createdBy: userId,
      type: 'kubernetes/v1',
      template: bucketKey,
      name: defaultDomain,
      domains: domains,
      appId: appId,
      ...(database
        ? {
            database: {
              host: database.host,
              port: database.port,
              name: database.name,
              user: database.user,
            },
          }
        : {}),
    };
    await client.db().collection(COLL_WEBSITES).insertOne(dbWebsite);

    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: appId },
        {
          $set: {
            backend: {
              type: 'wordpress',
              url: `${defaultUrl}/wp-json`,
              apiKey: 'invalid', // Set later by the website creation itself (setup.sh inside template)
            },
            'public.autoLoginDomains': domains,
            'public.defaultUrl': `${defaultUrl}/`,

            'settings.press.env.merchWPUrl': `${defaultUrl}/shop`,
            'settings.press.env.tabOrder':
              'today,categories,merchwp,community,search,settings',

            featurePlan: {
              _id: 'legacyFeaturePlanId',
              startedAt: new Date(),
            },
          },
        }
      );

    const lambdaInvokeArgs = {
      initTemplate: bucketKey,
      websiteId,
      domains: website.domains,
      wordpress: {
        adminLogin: website.account.email,
        adminPassword: website.account.password,
      },
      ...(database ? { database } : {}),
      container: {
        environmentVariables: {
          API_URL: MERCHWP_API_URL,
          LOGIN_APP_ID: ADMIN_APP,
          APP_ID: appId,
          SYNC_IMAGE_ID: website.sync.imageId,
          SYNC_IMAGE_URL: website.sync.imageUrl,
          PRIMARY_COLOR: website.colors.primary,
          SECONDARY_COLOR: website.colors.secondary,
        },
        environmentSecretVariables: {
          ADMIN_USER_ID: userId,
          ADMIN_LOGIN: website.account.email,
          ADMIN_SESSION: website.account.authToken,
        },
        crowdaaHostingImage: 'php',
        tag: '8.2-apache',
      },
    };

    await lambda
      .invokeAsync({
        FunctionName: MERCHWP_LAMBDA_CREATE_WEBSITE,
        InvokeArgs: JSON.stringify(lambdaInvokeArgs),
      })
      .promise();

    return dbWebsite;
  } finally {
    await client.close();
  }
}
