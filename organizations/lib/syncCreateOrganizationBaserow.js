/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  STAGE === 'prod'
    ? 'https://n8n.crowdaa.com/webhook/insert-organization-28716b61-546e-4a24-bd4b-f2bbb70d1b3a'
    : 'https://n8n.crowdaa.com/webhook-test/insert-organization-28716b61-546e-4a24-bd4b-f2bbb70d1b3a';
const BASEROW_METHOD = 'POST';

export default async (userId, { orgId, name, stripeCustomerId }) => {
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
              orgId,
              name,
              stripeCustomerId,
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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response error', error, 'for :', {
      userId,
      orgId,
      name,
    });
  }
};
