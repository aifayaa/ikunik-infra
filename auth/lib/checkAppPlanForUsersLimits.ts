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
import { PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS } from 'appsFeaturePlans/lib/planTypes';

const { REGION, CROWDAA_REGION } = process.env;

const { COLL_USERS, COLL_APPS } = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

async function checkAppPlanForUsersLimits(app: AppType | string) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    if (typeof app === 'string') {
      app = (await db.collection(COLL_USERS).findOne({ _id: app })) as AppType;
    }

    const appPlan = getCurrentPlanForApp(app);

    if (appPlan.features.appUsers === true) {
      return true;
    }
    if (!appPlan.features.appUsers) {
      return false;
    }

    const { maxCount, isSoft = false } = appPlan.features.appUsers;

    const usersCount = await db
      .collection(COLL_USERS)
      .find({ appId: app._id })
      .count();

    if (usersCount >= maxCount) {
      if (!isSoft) {
        return false;
      }

      if (app?.featurePlan?.featuresData?.appUsers?.softFeatureExceeded) {
        const { lastReminder } =
          app.featurePlan.featuresData.appUsers.softFeatureExceeded;

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
              subject: formatMessage('auth:userQuotaExceeded.title', { app }),
              template: `plan_user_quota_exceeded_${CROWDAA_REGION}`,
              vars: {
                app_id: app._id,
                app_name: app.name,
                quota: maxCount,
                count: usersCount,
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
        app?.featurePlan?.featuresData?.appUsers?.softFeatureExceeded || {};
      db.collection(COLL_APPS).updateOne(
        { _id: app._id },
        {
          $set: {
            'app.featurePlan.featuresData.appUsers.softFeatureExceeded': {
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

export default checkAppPlanForUsersLimits;
