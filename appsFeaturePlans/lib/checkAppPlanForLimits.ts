import { AppType } from '@apps/lib/appEntity';
import MongoClient from '@libs/mongoClient';
import { getCurrentPlanForApp } from 'appsFeaturePlans/lib/getCurrentPlan';
import mongoCollections from '../../libs/mongoCollections.json';
import getAppAdmins from '@apps/lib/getAppAdmins';
import { UserType } from '@users/lib/userEntity';
import {
  ComputedFeaturePlanType,
  FeatureExceededType,
  FeatureIdType,
  PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS,
} from 'appsFeaturePlans/lib/planTypes';
import { sendQuotaExceededMail } from './utils';

const { COLL_APPS } = mongoCollections;

async function sendReminderMailIfLastReminderIsTooOld(
  app: AppType,
  featureExceededInDB: FeatureExceededType,
  feature: FeatureIdType,
  maxCount: number,
  db: any
) {
  const { at, remindersCount, lastReminder } = featureExceededInDB;

  // ## Sending a reminder mail
  const timeSinceLastReminder = Date.now() - lastReminder.getTime();

  // If the last reminder is not too old, return
  if (
    remindersCount !== 0 &&
    timeSinceLastReminder <= PLAN_SOFT_FEATURE_DELAY_BETWEEN_REMINDERS
  ) {
    return;
  }

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
    maxCount
  );

  // Save information in the DB regarding the last reminder
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

// activeUsers
export async function checkAppPlanForLimitIncrease(
  app: AppType,
  feature: FeatureIdType,
  getCount: (app: AppType, appPlan: ComputedFeaturePlanType) => Promise<number>,
  options = { checkInDB: false }
) {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const appPlan = await getCurrentPlanForApp(app);

    // If the plan doesn't involve the feature, return 'false'
    if (!appPlan.features[feature]) {
      return false;
    }

    // If the plan does involve the feature as 'true', return 'false'
    if (appPlan.features[feature] === true) {
      return true;
    }

    const { maxCount, isSoft = false } = appPlan.features[feature];

    // If any, retrieve the last state of the excessive use of the feature,
    if (
      options.checkInDB &&
      app.featurePlan?.featuresData?.[feature]?.featureExceeded
    ) {
      // If the last reminder is too old, send a reminder mail
      await sendReminderMailIfLastReminderIsTooOld(
        app,
        app.featurePlan?.featuresData?.[feature]?.featureExceeded,
        feature,
        maxCount,
        db
      );

      // Manage if the plan is soft
      if (isSoft) {
        return true;
      } else {
        return false;
      }
    }

    const count = await getCount(app, appPlan);

    // If the current count is under the quota of the plan, return 'true'
    if (count < maxCount) {
      return true;
    }

    // # Manage the case when the quota of plan is exceeded
    // Create a new featureExceeded object
    const newFeatureExceeded = {
      at: new Date(),
      remindersCount: 0,
      lastReminder: new Date(),
    };

    // If the last reminder is too old, send a reminder mail
    await sendReminderMailIfLastReminderIsTooOld(
      app,
      newFeatureExceeded,
      feature,
      maxCount,
      db
    );

    // Manage if the plan is soft
    if (isSoft) {
      return true;
    } else {
      return false;
    }
  } finally {
    client.close();
  }
}

// TODO: Check if the limit is exceeded discarding the value in DB
// livestreaming, polls, badges

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
