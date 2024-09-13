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
  800 / 1000,
  900 / 1000,
  950 / 1000,
  990 / 1000,
];

const lambda = new Lambda({
  region: REGION,
});

type SendWarningEmailParamsType = {
  absoluteLimit: number;
  currentValue: number;
  blocked: boolean;
};

async function sendWarningEmail(
  app: AppType,
  { absoluteLimit, currentValue, blocked }: SendWarningEmailParamsType
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
      includeSuperAdmins: true,
    })) as UserType[];

    const appAdminsEmails = appAdmins.map((admin: UserType) => {
      const emailStr = `${admin.profile.firstname} ${admin.profile.lastname} <${admin.emails[0].address}>`;
      return emailStr;
    });
    const appsSuperAdminsEmails = appSuperAdmins.map((admin: UserType) => {
      const emailStr = `${admin.profile.firstname} ${admin.profile.lastname} <${admin.emails[0].address}>`;
      return emailStr;
    });

    const templateModel = blocked
      ? `plan_${feature}_quota_exceeded_${CROWDAA_REGION}`
      : `plan_${feature}_quota_warning_${CROWDAA_REGION}`;

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
            template: templateModel,
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

    if (blocked) {
      const { at = new Date(), remindersCount = 0 } =
        app?.featurePlan?.featuresData?.[feature]?.featureExceeded || {};
      await db.collection(COLL_APPS).updateOne(
        { _id: app._id },
        {
          $set: {
            [`app.featurePlan.featuresData.${feature}.featureExceeded`]: {
              at,
              lastReminder: new Date(),
              remindersCount: remindersCount + 1,
            },
          },
        }
      );
    }
  } finally {
    client.close();
  }
}

export async function userMetricsMAULimitChecks(
  app: AppType,
  activeUsersBefore: number,
  activeUsersAfter: number
) {
  if (!(activeUsersBefore < activeUsersAfter)) {
    return;
  }

  const appPlan = await getCurrentPlanForApp(app, false);
  console.log('checkAppPlanForLimits appPlan', appPlan);
  if (!(typeof appPlan.features.activeUsers === 'object')) {
    return;
  }

  const { maxCount } = appPlan.features.activeUsers;

  const ratioBefore = activeUsersBefore / maxCount;
  const ratioAfter = activeUsersAfter / maxCount;
  console.log('checkAppPlanForLimits ratioBefore', ratioBefore);
  console.log('checkAppPlanForLimits ratioAfter', ratioAfter);

  let crossedLimit: number | null = null;

  for (let [index, ratio] of MAU_WARNING_LIMIT_RATIOS.entries()) {
    if (ratioBefore <= ratio && ratio < ratioAfter) {
      crossedLimit = index;
      break;
    }
  }

  console.log('checkAppPlanForLimits maxCount', maxCount);
  console.log('checkAppPlanForLimits crossedLimit', crossedLimit);

  // If a threshold of users is crossed, send an email
  if (typeof crossedLimit === 'number') {
    await sendWarningEmail(app, {
      absoluteLimit: maxCount,
      currentValue: activeUsersAfter,
      blocked: false,
    });
  }
  // // Else, if the final threshold is crossed, send an email
  // else if (activeUsersBefore < maxCount && maxCount <= activeUsersAfter) {
  //   await sendWarningEmail(app, {
  //     absoluteLimit: maxCount,
  //     currentValue: activeUsersAfter,
  //     blocked: true,
  //   });
  // }
}
