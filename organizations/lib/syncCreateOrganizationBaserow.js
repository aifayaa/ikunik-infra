/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  'http://automation.operations.aws.crowdaa.com/webhook/insert-organization-28716b61-546e-4a24-bd4b-f2bbb70d1b3a';
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

export default async (userId, { orgId, name }) => {
  // if (STAGE === 'prod') {
  // if (CROWDAA_REGION === 'fr') { // For debug purposes only
  try {
    const resp = await callBaserowAPI({
      region: CROWDAA_REGION,
      stage: STAGE,
      userId,
      orgId,
      name,
    });

    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response', resp);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response error', error, 'for :', {
      userId,
      orgId,
      name,
    });

    throw error;
  }
  // }
};
