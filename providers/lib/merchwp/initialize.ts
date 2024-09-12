/* eslint-disable import/no-relative-packages */
import { adminRegister } from 'auth/lib/adminRegister';
import { login } from 'auth/lib/login';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { UserProfileType, UTMType } from '@users/lib/userEntity';
import createApp from '@apps/lib/createApp';
import { filterAppPrivateFields } from '@apps/lib/appsUtils';
import { AppType } from '@apps/lib/appEntity';

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

const { COLL_WEBSITES, COLL_APPS } = mongoCollections;

const {
  ADMIN_APP,
  CROWDAA_REGION,
  MERCHWP_API_URL,
  MERCHWP_LAMBDA_CREATE_WEBSITE,
  STAGE,
} = process.env as EnvType;

export type MerchWPInitializeParametersType = {
  account: {
    email: string;
    username: string;
    password: string;
    profile?: UserProfileType;
    utm?: UTMType;
  };
  app: {
    name: string;
    color: string;
  };
  website: {
    domains: string[];
  };
};

export default async ({
  account,
  app,
  website,
}: MerchWPInitializeParametersType) => {
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

    // Create app
    const dbApp = await createApp(app.name, loginResults.userId, {
      themeColorPrimary: app.color,
    });

    // Create website
    const websiteId = `merch${new ObjectID().toString()}`;

    const defaultDomain = `ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const defaultUrl = `https://ws-${websiteId}.${STAGE}-${CROWDAA_REGION}.aws.crowdaa.com`;
    const domains = [defaultDomain, ...website.domains];

    const dbWebsite = {
      _id: websiteId,
      createdAt: new Date(),
      createdBy: loginResults.userId,
      type: 'kubernetes/v1',
      name: defaultDomain,
      domains: domains,
      appId: dbApp._id,
    };
    await client.db().collection(COLL_WEBSITES).insertOne(dbWebsite);

    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: dbApp._id },
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
          },
        }
      );

    await lambda
      .invokeAsync({
        FunctionName: MERCHWP_LAMBDA_CREATE_WEBSITE,
        InvokeArgs: JSON.stringify({
          initTemplate: 'merchwp/merchwp-v0-20240911.zip',
          websiteId,
          domains: website.domains,
          wordpress: {
            adminLogin: account.email,
            adminPassword: account.password,
          },
          // Automatic, no DB setup
          // database: { host: '', port: 3306, name: '', user: '', password: '' },
          container: {
            environmentVariables: {
              API_URL: MERCHWP_API_URL,
              LOGIN_APP_ID: ADMIN_APP,
              APP_ID: dbApp._id,
            },
            environmentSecretVariables: {
              ADMIN_USER_ID: loginResults.userId,
              ADMIN_LOGIN: account.email,
              ADMIN_SESSION: loginResults.authToken,
            },
            crowdaaHostingImage: 'php',
            tag: '8.2-apache',
          },
        }),
      })
      .promise();

    return {
      session: loginResults,
      app: filterAppPrivateFields(dbApp as AppType),
      website: dbWebsite,
    };
  } finally {
    await client.close();
  }
};
