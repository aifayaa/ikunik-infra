import IVS from 'aws-sdk/clients/ivs';
import MongoClient from '@libs/mongoClient';
import { LiveStreamType } from './liveStreamTypes';
import { formatMessage } from '@libs/intl/intl';
import mongoCollections from '@libs/mongoCollections.json';
import { AppType } from '@apps/lib/appEntity';
import Lambda from 'aws-sdk/clients/lambda';
import { checkAppPlanForLimitIncrease } from 'appsFeaturePlans/lib/checkAppPlanForLimits';
import {
  ComputedFeaturePlanType,
  ComputedFeatureSpecification2Type,
  FeatureIdType,
} from 'appsFeaturePlans/lib/planTypes';
import computeLiveStreamDurationInMilliseconds from './computeLiveStreamDuration';
import getAppAdmins from '@apps/lib/getAppAdmins';
import { UserType } from '@users/lib/userEntity';
import {
  MailgunEmailParametersType,
  RequestOptionsType,
} from 'asyncLambdas/lib/sendEmailMailgun';
import getAppsSuperAdmins from '@apps/lib/getAppsSuperAdmins';
import { getCurrentPlanForApp } from 'appsFeaturePlans/lib/getCurrentPlan';
import { LIVESTREAM_PROVIDER_AWS_IVS } from './constants';

const { COLL_LIVE_STREAMS, COLL_APPS, COLL_LIVE_STREAMS_DURATIONS } =
  mongoCollections;

const { IVS_REGION, REGION, CROWDAA_REGION } = process.env;

const lambda = new Lambda({
  region: REGION,
});

const ivs = new IVS({
  apiVersion: '2020-07-14',
  region: IVS_REGION,
});

const SEND_WARNING_WHEN_REMAINING_TIME_PERCENT = 5 / 100;

type SendReminderOptionsType = {
  remainingDays: number;
  remainingTime: number;
  hoursQuota: number;
  warning: boolean;
};

async function sendAlertEmail(
  app: AppType,
  { remainingDays, remainingTime, hoursQuota, warning }: SendReminderOptionsType
) {
  const feature: FeatureIdType = 'liveStreamDuration';
  const appAdmins = (await getAppAdmins(app._id, {
    userProjection: {
      _id: 1,
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    },
    includeSuperAdmins: false,
  })) as UserType[];
  const appSuperAdmins = (await getAppsSuperAdmins({
    userProjection: {
      _id: 1,
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    },
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
          subject: formatMessage(
            `general:${warning ? 'quotaWarning' : 'quotaExceeded'}.${feature}.title`,
            {
              app,
            }
          ),
          template: warning
            ? `plan_${feature}_quota_warning_${CROWDAA_REGION}`
            : `plan_${feature}_quota_exceeded_${CROWDAA_REGION}`,
          vars: {
            remaining_days:
              remainingDays > 1
                ? remainingDays.toFixed(0)
                : remainingDays.toFixed(1),
            remaining_time: remainingTime.toFixed(0),
            appName: app.name,
            hoursQuota,
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
}

export type CheckLiveStreamDurationInputType = {
  channelArn: string;
  streamId: string;
  dbStreamId: string;
  appId: string;
};

async function computeLiveStreamDuration(app: AppType) {
  const appPlan = await getCurrentPlanForApp(app);
  const liveStreamDuration = appPlan.features
    .liveStreamDuration as ComputedFeatureSpecification2Type;

  const { startDate: periodStartDate, resetDate: periodResetDate } =
    liveStreamDuration.currentPeriod;

  const totalDurationInMilliseconds =
    await computeLiveStreamDurationInMilliseconds(app._id, {
      from: periodStartDate,
      to: periodResetDate,
    });

  const totalDurationInHours =
    totalDurationInMilliseconds / (1 * 60 * 60 * 1000);

  return { totalDurationInHours, totalDurationInMilliseconds, appPlan };
}

async function sendAlertEmailIfNecessary(
  app: AppType,
  appPlan: ComputedFeaturePlanType,
  totalDurationInHours: number
) {
  const liveStreamDuration = appPlan.features
    .liveStreamDuration as ComputedFeatureSpecification2Type;

  const {
    maxCount,
    currentPeriod: { startDate: periodStartDate, resetDate: periodResetDate },
  } = liveStreamDuration;

  // If the current duration of the streaming is under a threshold, do not send an email
  if (
    !(
      maxCount - totalDurationInHours <
      SEND_WARNING_WHEN_REMAINING_TIME_PERCENT * maxCount
    )
  ) {
    return;
  }

  // If the application doesn't subscribe to any plan, do not send an email
  if (!app.featurePlan?._id) {
    return;
  }

  const client = await MongoClient.connect();

  const lastReminder =
    app.featurePlan.featuresData?.liveStreamDuration?.featureExceeded
      ?.lastReminder;

  // Compute wether a mail must be sent depending on the last reminder,
  // the reset date and the start date of the streaming
  const sendWarning = lastReminder
    ? periodResetDate < lastReminder && lastReminder < periodStartDate
    : true;

  if (!sendWarning) {
    return;
  }

  await sendAlertEmail(app, {
    warning: true,
    remainingDays:
      (periodResetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    remainingTime: (maxCount - totalDurationInHours) * 60,
    hoursQuota: maxCount,
  });

  const { at = new Date(), remindersCount = 0 } =
    app?.featurePlan?.featuresData?.liveStreamDuration?.featureExceeded || {};

  await client
    .db()
    .collection(COLL_APPS)
    .updateOne(
      { _id: app._id },
      {
        $set: {
          'featurePlan.featuresData.liveStreamDuration.featureExceeded': {
            at,
            lastReminder: new Date(),
            remindersCount: remindersCount + 1,
          },
        },
      }
    );
}

export async function checkLiveStreamDuration({
  channelArn,
  streamId,
  dbStreamId,
  appId,
}: CheckLiveStreamDurationInputType) {
  const client = await MongoClient.connect();

  try {
    const app = (await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId })) as AppType | null;

    if (!app) {
      return {
        error: `App ${appId} not found`,
        retry: false,
      };
    }

    const dbStream = (await client.db().collection(COLL_LIVE_STREAMS).findOne({
      _id: dbStreamId,
      appId,
    })) as LiveStreamType | null;

    if (!dbStream) {
      return {
        error: `DB LiveStream ${dbStreamId} not found`,
        retry: false,
      };
    }

    let awsStream;
    try {
      awsStream = await ivs
        .getStreamSession({
          channelArn,
          streamId,
        })
        .promise();
    } catch (e) {
      const err = e as Error;
      if (err.name === 'ResourceNotFoundException') {
        return {
          error: `Error getting session ${channelArn} / ${streamId} for app/liveStream ${appId}/${dbStreamId} : ${e}`,
          retry: false,
        };
      }
      return {
        error: `Error getting session ${channelArn} / ${streamId} for app/liveStream ${appId}/${dbStreamId} : ${e}`,
        retry: true,
      };
    }

    let ended = false;
    if (awsStream?.streamSession) {
      const { startTime, endTime } = awsStream.streamSession;

      let duration = 0;
      if (startTime && endTime) {
        duration = endTime.getTime() - startTime.getTime();
      }

      ended = !!endTime;

      await client
        .db()
        .collection(COLL_LIVE_STREAMS_DURATIONS)
        .updateOne(
          {
            appId,
            type: dbStream.provider,
            liveStreamId: dbStreamId,
            awsStreamId: streamId,
          },
          {
            $set: {
              appId,
              type: dbStream.provider,
              liveStreamId: dbStreamId,
              awsStreamId: streamId,

              startTime,
              endTime,
              duration,
            },
          },
          {
            upsert: true,
          }
        );
    }

    // The callback here contain to many logics, it should be refactored
    const allowed = await checkAppPlanForLimitIncrease(
      app,
      'liveStreamDuration',
      async () => {
        const { totalDurationInHours, appPlan } =
          await computeLiveStreamDuration(app);

        await sendAlertEmailIfNecessary(app, appPlan, totalDurationInHours);
        return totalDurationInHours;
      }
    );

    if (!allowed) {
      const appPlan = await getCurrentPlanForApp(app, ['liveStreamDuration']);
      const liveStreamDuration = appPlan.features
        .liveStreamDuration as ComputedFeatureSpecification2Type;
      const planValues =
        typeof liveStreamDuration.currentPeriod === 'object'
          ? liveStreamDuration
          : { currentPeriod: { startDate: new Date(), resetDate: new Date() } };
      await sendAlertEmail(app, {
        warning: false,
        remainingDays:
          (planValues.currentPeriod.resetDate.getTime() - Date.now()) /
          (24 * 60 * 60 * 1000),
        remainingTime: 0,
        hoursQuota: liveStreamDuration.maxCount,
      });

      await ivs.deleteStreamKey({ arn: dbStream.aws.streamKeyArn }).promise();
      await ivs.stopStream({ channelArn }).promise();

      await client
        .db()
        .collection(COLL_LIVE_STREAMS)
        .updateOne(
          { _id: app._id },
          {
            $set: { streamKey: '', 'aws.streamKeyArn': '' },
          }
        );

      return {
        allowed: false,
        retry: false,
      };
    }

    return {
      retry: !ended,
    };
  } catch (e) {
    console.warn('Unexpected error', e);
    return {
      error: `Unexpected exception : ${e}`,
      retry: true,
    };
  } finally {
    client.close();
  }
}
