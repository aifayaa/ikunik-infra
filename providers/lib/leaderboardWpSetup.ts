/* eslint-disable import/no-relative-packages */
import AWS from 'aws-sdk';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import Random from '@libs/account_utils/random';
import { WebsiteKubernetesV1Type } from 'websites/lib/websiteTypes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import Cloudflare from 'cloudflare';
import {
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_PICTURE_CODE,
  MISSING_APPLICATION_CODE,
  MISSING_PICTURE_CODE,
  MISSING_USER_CODE,
  TEMPLATE_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { AppType } from '@apps/lib/appEntity';

const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_WEBSITES, COLL_APPS, COLL_USERS, COLL_PICTURES } =
  mongoCollections;

const {
  ADMIN_APP,
  CLOUDFLARE_API_TOKEN,
  CROWDAA_REGION,
  MERCHWP_LAMBDA_CREATE_WEBSITE,
  STAGE,
} = process.env as {
  ADMIN_APP: string;
  CLOUDFLARE_API_TOKEN: string;
  CROWDAA_REGION: string;
  MERCHWP_LAMBDA_CREATE_WEBSITE: string;
  STAGE: string;
};

const cloudflare = new Cloudflare({
  apiToken: STAGE === 'prod' ? CLOUDFLARE_API_TOKEN : '',
});

const rdsDataService = new AWS.RDSDataService();

const {
  MICROSERVICES_API_URL,
  WEBSITES_TEMPLATES_BUCKET,
  WEBSITES_DATABASE_ARN,
  WEBSITES_DATABASE_CREDENTIALS_ARN,
  WEBSITES_DATABASE_HOST,
} = process.env as {
  MICROSERVICES_API_URL: string;
  WEBSITES_TEMPLATES_BUCKET: string;
  WEBSITES_DATABASE_ARN: string;
  WEBSITES_DATABASE_CREDENTIALS_ARN: string;
  WEBSITES_DATABASE_HOST: string;
};

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

type LeaderboardWpSetupParamsType = {
  iapPollId: string;
  defaultPictureId: string;
};

export default async (
  userId: string,
  appId: string,
  { iapPollId, defaultPictureId }: LeaderboardWpSetupParamsType
) => {
  const client = await MongoClient.connect();
  let session = null;

  try {
    const bucketKey = `leaderboard/leaderboard-20241202.zip`;
    let objAttrs = null;
    try {
      objAttrs = await s3
        .getObjectAttributes({
          Bucket: WEBSITES_TEMPLATES_BUCKET,
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
        `Template ${bucketKey} not found`
      );
    }

    const dbApp = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId });
    if (!dbApp) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_APPLICATION_CODE,
        'Missing appId provided'
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
        'Missing userId provided'
      );
    }

    const dbPicture = await client
      .db()
      .collection(COLL_PICTURES)
      .findOne({ _id: defaultPictureId, appId });
    if (!dbPicture) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        MISSING_PICTURE_CODE,
        'Missing pictureId provided'
      );
    }
    if (!dbPicture.pictureUrl) {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_PICTURE_CODE,
        'Invalid pictureId provided'
      );
    }

    const userEmail = dbUser.emails[0].address;

    const database = await setupDatabase();

    const websiteId = `leaderboardwp${new ObjectID().toString()}`;

    const defaultDomain = `ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const cloudflareDomain = `${appId}-voting.crowdaa.com`;
    const domains = [defaultDomain, cloudflareDomain];
    const autologinToken = Random.id(48);
    const userRndPassword = Random.secret(50);

    const dbWebsite: WebsiteKubernetesV1Type = {
      _id: websiteId,
      createdAt: new Date(),
      createdBy: userId,
      type: 'kubernetes/v1',
      template: bucketKey,
      name: defaultDomain,
      features: ['leaderboardwp'],
      domains: domains,
      appId: appId,
      database: {
        host: database.host,
        port: database.port,
        name: database.name,
        user: database.user,
      },
    };

    session = client.startSession();
    session.startTransaction();
    await client
      .db()
      .collection(COLL_WEBSITES)
      .insertOne(dbWebsite, { session });

    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: appId },
        {
          $set: {
            'credentials.leaderboardWp': {
              autologinToken,
            },
            'settings.press.env.leaderboardWpUrl': `https://${cloudflareDomain}`,
            'settings.press.env.tabOrder':
              'today,voting,leaderboard,submissions,explore,settings',
          },
        },
        { session }
      );

    await session.commitTransaction();
    session = null;

    const lambdaInvokeArgs = {
      initTemplate: bucketKey,
      websiteId,
      domains: [cloudflareDomain],
      wordpress: {
        adminLogin: userEmail,
        adminPassword: userRndPassword,
      },
      ...(database ? { database } : {}),
      container: {
        environmentVariables: {
          API_URL: MICROSERVICES_API_URL,
          LOGIN_APP_ID: ADMIN_APP,
          APP_ID: appId,
          SYNC_IMAGE_ID: defaultPictureId,
          SYNC_IMAGE_URL: dbPicture.pictureUrl,
          IAP_POLL_ID: iapPollId,
        },
        environmentSecretVariables: {
          ADMIN_LOGIN: userEmail,
          CROWDAA_AUTOLOGIN_TOKEN: autologinToken,
          ADMIN_SESSION: '',
          ADMIN_USER_ID: '',
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

    await cloudflare.dns.records.create({
      zone_id: 'crowdaa.com',
      content: defaultDomain,
      name: `${appId}-voting`,
      type: 'CNAME',
      comment: `Record for app ${dbApp.name} leaderboard/voting website`,
      proxied: true,
      tags: ['leaderboard', 'voting'],
      ttl: 600,
    });

    const dbAppUpdated = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId });

    return dbAppUpdated as AppType;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    client.close();
    if (session) session.endSession();
  }
};
