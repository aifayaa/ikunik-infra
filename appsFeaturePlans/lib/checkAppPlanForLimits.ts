import { AppType } from '@apps/lib/appEntity';
import MongoClient from '@libs/mongoClient';
import { getCurrentPlanForApp } from 'appsFeaturePlans/lib/getCurrentPlan';
import mongoCollections from '../../libs/mongoCollections.json';
import Lambda from 'aws-sdk/clients/lambda';
import getAppAdmins from '@apps/lib/getAppAdmins';
import {
  MailgunEmailParametersType,
  RequestOptionsType,
} from 'asyncLambdas/lib/sendEmailMailgun';
import { UserType } from '@users/lib/userEntity';
import { formatMessage } from '@libs/intl/intl';
import {
  FeatureIdType,
  PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS,
} from 'appsFeaturePlans/lib/planTypes';

const { REGION, CROWDAA_REGION } = process.env;

const { COLL_APPS } = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

export async function checkAppPlanForLimitIncrease(
  app: AppType | string,
  feature: FeatureIdType,
  getCount: (app: AppType) => Promise<number>
) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    if (typeof app === 'string') {
      app = (await db.collection(COLL_APPS).findOne({ _id: app })) as AppType;
    }

    const appPlan = getCurrentPlanForApp(app);

    if (appPlan.features[feature] === true) {
      return true;
    }
    if (!appPlan.features[feature]) {
      return false;
    }

    const { maxCount, isSoft = false } = appPlan.features[feature];

    const count = await getCount(app);

    if (count >= maxCount) {
      if (!isSoft) {
        return false;
      }

      if (app?.featurePlan?.featuresData?.[feature]?.softFeatureExceeded) {
        const { lastReminder } =
          app.featurePlan.featuresData[feature].softFeatureExceeded;

        const diff = Date.now() - lastReminder.getTime();
        if (diff < PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS) {
          return true;
        }
      }

      const appAdmins = (await getAppAdmins(app._id, {
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
      await lambda
        .invokeAsync({
          FunctionName: `asyncLambdas-${process.env.STAGE}-networkRequest`,
          InvokeArgs: JSON.stringify({
            email: {
              from: 'No Reply <support@crowdaa.com>',
              to: appAdminsEmails.join(','),
              subject: formatMessage(`general:quotaExceeded.${feature}.title`, {
                app,
              }),
              template: `plan_${feature}_quota_exceeded_${CROWDAA_REGION}`,
              vars: {
                app_id: app._id,
                app_name: app.name,
                quota: maxCount,
                count,
              },
              extra: {},
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
      db.collection(COLL_APPS).updateOne(
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
    }

    return true;
  } finally {
    client.close();
  }
}

export async function checkAppPlanForLimitAccess(
  app: AppType | string,
  feature: FeatureIdType
) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    if (typeof app === 'string') {
      app = (await db.collection(COLL_APPS).findOne({ _id: app })) as AppType;
    }

    const appPlan = getCurrentPlanForApp(app);

    if (appPlan.features[feature] === true) {
      return true;
    }
    if (!appPlan.features[feature]) {
      return false;
    }

    return true;
  } finally {
    client.close();
  }
}
