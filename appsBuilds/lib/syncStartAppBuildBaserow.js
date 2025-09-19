/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';

const { CROWDAA_REGION, STAGE } = process.env;

const lambda = new Lambda({
  region: process.env.REGION,
});

const BASEROW_IOS_URL =
  STAGE === 'prod'
    ? 'https://n8n.crowdaa.com/webhook/build-ios-cb736e53-18e8-442b-90a2-68b98844fb43'
    : 'https://n8n.crowdaa.com/webhook-test/build-ios-cb736e53-18e8-442b-90a2-68b98844fb43';

const BASEROW_ANDROID_URL =
  STAGE === 'prod'
    ? 'https://n8n.crowdaa.com/webhook/build-android-cf98e5c9-6b5f-414e-9196-846681a98c48'
    : 'https://n8n.crowdaa.com/webhook-test/build-android-cf98e5c9-6b5f-414e-9196-846681a98c48';
const BASEROW_METHOD = 'POST';

export default async ({ appId, userId, platform }) => {
  try {
    const uri = platform === 'android' ? BASEROW_ANDROID_URL : BASEROW_IOS_URL;
    await lambda
      .invokeAsync({
        FunctionName: `asyncLambdas-${process.env.STAGE}-networkRequest`,
        InvokeArgs: JSON.stringify({
          request: {
            method: BASEROW_METHOD,
            uri,
            headers: {},
            json: {
              appId,
              platform,
              region: CROWDAA_REGION,
              stage: STAGE,
              userId,
            },
          },
          options: {
            retries: 5,
            sleepBetweenRetries: 30 * 1000,
            logErrors: true,
          },
        }),
      })
      .promise();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API lambda call error', e, 'for :', {
      appId,
      platform,
      userId,
    });
  }
};
