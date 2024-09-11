import Lambda from 'aws-sdk/clients/lambda';
import {
  MailgunEmailParametersType,
  RequestOptionsType,
} from 'asyncLambdas/lib/sendEmailMailgun';
import { getEnvironmentVariable } from '@libs/check';
import { FeatureIdType, FeaturePlanIdType } from './planTypes';
import { AppType } from '@apps/lib/appEntity';
import { formatMessage } from '@libs/intl/intl';

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

export async function sendQuotaExceededMail(
  app: AppType,
  feature: FeatureIdType,
  appAdminsEmails: string[],
  appsSuperAdminsEmails: string[],
  quota: number,
  count: number
) {
  const REGION = getEnvironmentVariable('REGION');
  const CROWDAA_REGION = getEnvironmentVariable('CROWDAA_REGION');

  const lambda = new Lambda({
    region: REGION,
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
            app_id: app._id,
            app_name: app.name,
            quota,
            count,
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
