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
  ComputedFeaturePlanType,
  FeatureIdType,
  PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS,
} from 'appsFeaturePlans/lib/planTypes';
import { sendQuotaExceededMail } from './utils';

const { COLL_APPS } = mongoCollections;

async function sendReminderMail(
  app: AppType,
  feature: FeatureIdType,
  maxCount: number,
  count: number
) {
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

  await sendQuotaExceededMail(
    app,
    feature,
    appAdminsEmails,
    appsSuperAdminsEmails,
    maxCount,
    count
  );
}

export async function checkAppPlanForLimitIncrease(
  app: AppType | string,
  feature: FeatureIdType,
  getCount: (app: AppType, appPlan: ComputedFeaturePlanType) => Promise<number>
) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    if (typeof app === 'string') {
      app = (await db.collection(COLL_APPS).findOne({ _id: app })) as AppType;
    }

    const appPlan = await getCurrentPlanForApp(app);

    if (appPlan.features[feature] === true) {
      return true;
    }

    if (!appPlan.features[feature]) {
      return false;
    }

    const { maxCount, isSoft = false } = appPlan.features[feature];

    const count = await getCount(app, appPlan);

    if (count >= maxCount) {
      if (!isSoft) {
        return false;
      }

      if (app?.featurePlan?.featuresData?.[feature]?.featureExceeded) {
        const { lastReminder } =
          app.featurePlan.featuresData[feature].featureExceeded;

        const diff = Date.now() - lastReminder.getTime();
        if (diff < PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS) {
          return true;
        }
      }

      await sendReminderMail(app, feature, maxCount, count);

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

    const appPlan = await getCurrentPlanForApp(app);

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
