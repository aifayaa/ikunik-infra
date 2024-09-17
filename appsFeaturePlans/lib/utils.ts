import Lambda from 'aws-sdk/clients/lambda';
import {
  MailgunEmailParametersType,
  RequestOptionsType,
} from 'asyncLambdas/lib/sendEmailMailgun';
import { getEnvironmentVariable } from '@libs/check';
import { FeatureIdType, FeaturePlanIdType } from './planTypes';
import { formatMessage } from '@libs/intl/intl';
import getAppAdmins from '@apps/lib/getAppAdmins';
import { UserType } from '@users/lib/userEntity';
import { getCurrentPlanForApp } from './getCurrentPlan';
import { AppType } from '@apps/lib/appEntity';

const STRIPE_PRICE_ID_PRO = getEnvironmentVariable('STRIPE_PRICE_ID_PRO', {
  dontThrow: true,
});

const stripePriceIdToFeaturePlanIdMap: Record<string, FeaturePlanIdType> = {
  [STRIPE_PRICE_ID_PRO]: 'proFeaturePlanId',
};

export function getFeaturePlanIdFromStripePriceId(
  stripePriceId: string
): FeaturePlanIdType {
  return stripePriceIdToFeaturePlanIdMap[stripePriceId];
}

async function sendQuotaMail(
  feature: FeatureIdType,
  appAdminsEmails: string[],
  appsSuperAdminsEmails: string[],
  mailVariables: { appName: string; usersMax: number; currentUsers?: number },
  type: 'exceeded' | 'warning'
) {
  const REGION = getEnvironmentVariable('REGION');
  const CROWDAA_REGION = getEnvironmentVariable('CROWDAA_REGION');
  const STAGE = getEnvironmentVariable('STAGE');

  const lambda = new Lambda({
    region: REGION,
  });

  const { appName } = mailVariables;

  const subjectTranslationId =
    type === 'exceeded'
      ? `general:quotaExceeded.${feature}.title`
      : `general:quotaWarning.${feature}.title`;
  const templateModelId =
    type === 'exceeded'
      ? `plan_${feature}_quota_exceeded_${CROWDAA_REGION}`
      : `plan_${feature}_quota_warning_${CROWDAA_REGION}`;

  await lambda
    .invokeAsync({
      FunctionName: `asyncLambdas-${STAGE}-sendEmailMailgun`,
      InvokeArgs: JSON.stringify({
        email: {
          from: 'No Reply <support@crowdaa.com>',
          to: appAdminsEmails.join(','),
          subject: formatMessage(subjectTranslationId, {
            appName,
          }),
          template: templateModelId,
          vars: mailVariables,
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

async function getAppAdminsEmails(appId: string) {
  const appAdmins = (await getAppAdmins(appId, {
    userProjection: {
      _id: 1,
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    },
    includeSuperAdmins: false,
  })) as UserType[];

  return appAdmins.map((admin: UserType) => {
    const emailStr = `${admin.profile.firstname} ${admin.profile.lastname} <${admin.emails[0].address}>`;
    return emailStr;
  });
}

async function getAppSuperAdminsEmails(appId: string) {
  const appSuperAdmins = (await getAppAdmins(appId, {
    userProjection: {
      _id: 1,
      'emails.address': 1,
      'profile.firstname': 1,
      'profile.lastname': 1,
    },
    includeSuperAdmins: true,
  })) as UserType[];

  return appSuperAdmins.map((admin: UserType) => {
    const emailStr = `${admin.profile.firstname} ${admin.profile.lastname} <${admin.emails[0].address}>`;
    return emailStr;
  });
}

export async function sendQuotaExceededMail(
  appId: string,
  feature: FeatureIdType,
  mailVariables: { appName: string; usersMax: number }
) {
  const appAdminsEmails = await getAppAdminsEmails(appId);
  const appsSuperAdminsEmails = await getAppSuperAdminsEmails(appId);

  await sendQuotaMail(
    feature,
    appAdminsEmails,
    appsSuperAdminsEmails,
    mailVariables,
    'exceeded'
  );
}

export async function sendQuotaWarningMail(
  appId: string,
  feature: FeatureIdType,
  mailVariables: { appName: string; usersMax: number; currentUsers: number }
) {
  const appAdminsEmails = await getAppAdminsEmails(appId);
  const appsSuperAdminsEmails = await getAppSuperAdminsEmails(appId);

  await sendQuotaMail(
    feature,
    appAdminsEmails,
    appsSuperAdminsEmails,
    mailVariables,
    'warning'
  );
}

const MAU_WARNING_LIMIT_RATIOS = [
  800 / 1000,
  900 / 1000,
  950 / 1000,
  990 / 1000,
];

export async function sendMAULimitWarningEmailIfNecessary(
  app: AppType,
  activeUsersBefore: number,
  activeUsersAfter: number
) {
  // If the number of active users didn't change, return
  if (!(activeUsersBefore < activeUsersAfter)) {
    return;
  }

  const appPlan = await getCurrentPlanForApp(app, false);
  // If the app's plan doesn't involve numerical restriction against MAU, return
  if (!(typeof appPlan.features.activeUsers === 'object')) {
    return;
  }

  const { maxCount } = appPlan.features.activeUsers;

  const ratioBefore = activeUsersBefore / maxCount;
  const ratioAfter = activeUsersAfter / maxCount;

  let hasLimitRatioHasBeenCrossed = false;

  for (let ratio of MAU_WARNING_LIMIT_RATIOS) {
    if (ratioBefore <= ratio && ratio < ratioAfter) {
      hasLimitRatioHasBeenCrossed = true;
      break;
    }
  }

  // If a threshold of users is crossed, send an email
  // if (typeof crossedLimit === 'number') {
  if (hasLimitRatioHasBeenCrossed) {
    await sendQuotaWarningMail(app._id, 'activeUsers', {
      appName: app.name,
      usersMax: maxCount,
      currentUsers: activeUsersAfter,
    });
  }
}
