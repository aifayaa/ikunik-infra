/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_IOS_URL =
  STAGE === 'prod'
    ? 'http://automation.operations.aws.crowdaa.com/webhook/build-ios-cb736e53-18e8-442b-90a2-68b98844fb43'
    : 'http://automation.operations.aws.crowdaa.com/webhook-test/build-ios-cb736e53-18e8-442b-90a2-68b98844fb43';

const BASEROW_ANDROID_URL =
  STAGE === 'prod'
    ? 'http://automation.operations.aws.crowdaa.com/webhook/build-android-cf98e5c9-6b5f-414e-9196-846681a98c48'
    : 'http://automation.operations.aws.crowdaa.com/webhook-test/build-android-cf98e5c9-6b5f-414e-9196-846681a98c48';
const BASEROW_METHOD = 'POST';

async function callBaserowAPI(data, platform) {
  const uri = platform === 'android' ? BASEROW_ANDROID_URL : BASEROW_IOS_URL;
  const params = {
    method: BASEROW_METHOD,
    uri,
    headers: {},
    json: data,
  };

  const rawResponse = await request(params);

  let response = rawResponse;

  if (typeof rawResponse === 'string') {
    response = JSON.parse(response);
  }

  return response;
}

export default async ({ appId, userId, platform }) => {
  try {
    const resp = await callBaserowAPI(
      {
        appId,
        platform,
        region: CROWDAA_REGION,
        stage: STAGE,
        userId,
      },
      platform
    );

    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response', resp);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response error', e, 'for :', {
      appId,
      platform,
      userId,
    });
  }
  // }
};
