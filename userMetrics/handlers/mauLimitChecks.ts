import Lambda from 'aws-sdk/clients/lambda';
import { AppType } from '@apps/lib/appEntity';
import { UserType } from '@users/lib/userEntity';
import { getCurrentPlanForApp } from 'appsFeaturePlans/lib/getCurrentPlan';
import getAppAdmins from '@apps/lib/getAppAdmins';
import mongoCollections from '../../libs/mongoCollections.json';
import { formatMessage } from '@libs/intl/intl';
import { FeatureIdType } from 'appsFeaturePlans/lib/planTypes';
import {
  MailgunEmailParametersType,
  RequestOptionsType,
} from 'asyncLambdas/lib/sendEmailMailgun';
import MongoClient from '@libs/mongoClient';

const { COLL_APPS } = mongoCollections;

const { REGION, CROWDAA_REGION } = process.env;

const MAU_WARNING_LIMIT_RATIOS = [
  990 / 1000,
  950 / 1000,
  900 / 1000,
  800 / 1000,
];

const lambda = new Lambda({
  region: REGION,
});

type SendWarningEmailParamsType = {
  absoluteLimit: number;
  crossedLimit: number;
  currentValue: number;
  blocked: boolean;
};

async function sendWarningEmail(
  app: AppType,
  {
    absoluteLimit,
    crossedLimit,
    currentValue,
    blocked,
  }: SendWarningEmailParamsType
) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const feature: FeatureIdType = 'activeUsers';
    const appAdmins = (await getAppAdmins(app._id, {
      userProjection: {
        _id: 1,
        'emails.address': 1,
        'profile.firstname': 1,
        'profile.lastname': 1,
      },
      includeSuperAdmins: false,
    })) as UserType[];
    const appSuperAdmins = (await getAppAdmins(app._id, {
      userProjection: {
        _id: 1,
        'emails.address': 1,
        'profile.firstname': 1,
        'profile.lastname': 1,
      },
      includeSuperAdmins: false,
    })) as UserType[];

    const appAdminsEmails = appAdmins.map((admin: UserType) => {
      const emailStr = `${admin.profile.firstname} ${admin.profile.lastname} <${admin.emails[0].address}>`;
      return emailStr;
    });
    const appsSuperAdminsEmails = appSuperAdmins.map((admin: UserType) => {
      const emailStr = `${admin.profile.firstname} ${admin.profile.lastname} <${admin.emails[0].address}>`;
      return emailStr;
    });
    await lambda
      .invokeAsync({
        FunctionName: `asyncLambdas-${process.env.STAGE}-sendEmailMailgun`,
        InvokeArgs: JSON.stringify({
          email: {
            from: 'No Reply <support@crowdaa.com>',
            to: appAdminsEmails.join(','),
            subject: formatMessage(`general:quotaExceeded.${feature}.title`, {
              app,
            }),
            template: `plan_${feature}_quota_exceeded_${CROWDAA_REGION}`,
            vars: {
              appName: app.name,
              usersMax: absoluteLimit,
              currentUsers: currentValue,
            },
            extra: {
              bcc: appsSuperAdminsEmails.join(','),
            },
          } as MailgunEmailParametersType,
          options: {
            retries: 5,
            sleepBetweenRetries: 30 * 1000,
            logErrors: true,
          } as RequestOptionsType,
        }),
      })
      .promise();

    const { at = new Date(), remindersCount = 0 } =
      app?.featurePlan?.featuresData?.[feature]?.softFeatureExceeded || {};
    await db.collection(COLL_APPS).updateOne(
      { _id: app._id },
      {
        $set: {
          [`app.featurePlan.featuresData.${feature}.softFeatureExceeded`]: {
            at,
            lastReminder: new Date(),
            remindersCount: remindersCount + 1,
          },
        },
      }
    );
  } finally {
    client.close();
  }
}

export async function userMetricsMAULimitChecks(
  app: AppType,
  activeUsersBefore: number,
  activeUsersAfter: number
) {
  if (activeUsersBefore < activeUsersAfter) {
    const appPlan = await getCurrentPlanForApp(app, false);
    if (typeof appPlan.features.activeUsers === 'object') {
      const { maxCount } = appPlan.features.activeUsers;
      const crossedLimit = MAU_WARNING_LIMIT_RATIOS.find((ratio) => {
        const limit = maxCount * ratio;
        if (activeUsersBefore <= limit && activeUsersAfter > limit) {
          return limit;
        }
        return null;
      });

      if (crossedLimit) {
        await sendWarningEmail(app, {
          absoluteLimit: ...,
          crossedLimit: ...,
          currentValue: ...,
          blocked: false,
        });
      } else if (activeUsersBefore < maxCount && activeUsersAfter >= maxCount) {
        await sendWarningEmail(app, {
          absoluteLimit: ...,
          crossedLimit: ...,
          currentValue: ...,
          blocked: true,
        });
      }
    }
  }
}
