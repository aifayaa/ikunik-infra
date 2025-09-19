/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  STAGE === 'prod'
    ? 'https://n8n.crowdaa.com/webhook/createProjects-fa567-anbo86-eocq9-p7t58re'
    : 'https://n8n.crowdaa.com/webhook-test/createProjects-fa567-anbo86-eocq9-p7t58re';
const BASEROW_METHOD = 'POST';

export default async (userId, { appId, name, apiKey }) => {
  try {
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
              appId,
              name,
              apiKey,
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
      userId,
      appId,
      name,
      apiKey,
    });
  }
  // }
};
