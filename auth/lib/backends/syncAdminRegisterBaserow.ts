/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import { UTMType, UserProfileType } from '../../../users/lib/userEntity';
import { RequestOptionsType } from '../../../asyncLambdas/lib/networkRequest';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  STAGE === 'prod'
    ? 'https://n8n.crowdaa.com/webhook/createCustomerCrowdaa-mdfi-pd2645-95dg-dol9'
    : 'https://n8n.crowdaa.com/webhook-test/createCustomerCrowdaa-mdfi-pd2645-95dg-dol9';
const BASEROW_METHOD = 'POST';

export default async (
  userId: string,
  {
    email,
    username,
    profile,
    utm,
  }: {
    email: string;
    username: string;
    profile: UserProfileType;
    utm?: UTMType;
  }
) => {
  try {
    const extra = utm ? { utm } : {};
    await lambda
      .invokeAsync({
        FunctionName: `asyncLambdas-${process.env.STAGE}-networkRequest`,
        InvokeArgs: JSON.stringify({
          request: {
            method: BASEROW_METHOD,
            uri: BASEROW_URL,
            headers: {},
            json: {
              region: CROWDAA_REGION,
              stage: STAGE,
              userId,
              email,
              username,
              profile,
              ...extra,
            },
          },
          options: {
            retries: 5,
            sleepBetweenRetries: 30 * 1000,
            logErrors: true,
          },
        } as RequestOptionsType),
      })
      .promise();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API lambda call error', e, 'for :', {
      BASEROW_URL,
      userId,
      email,
      username,
      profile,
      utm,
    });
  }
};
