import request from 'request-promise-native';

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  'http://automation.operations.aws.crowdaa.com/webhook-test/createCustomerCrowdaa';
const BASEROW_METHOD = 'POST';

async function callBaserowAPI(data) {
  const uri = BASEROW_URL;
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

export default async (userId, { email, username, profile }) => {
  // if (STAGE === 'prod') {
  // if (CROWDAA_REGION === 'fr') { // For debug purposes only
  try {
    const resp = await callBaserowAPI({
      region: CROWDAA_REGION,
      stage: STAGE,
      userId,
      email,
      username,
      profile,
    });

    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response', resp);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response error', e, 'for :', {
      userId,
      email,
      username,
      profile,
    });
  }
  // }
};
