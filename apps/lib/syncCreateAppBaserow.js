/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  'http://automation.operations.aws.crowdaa.com/webhook/createProjects-fa567-anbo86-eocq9-p7t58re';
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

export default async (userId, { appId, name, apiKey }) => {
  // if (STAGE === 'prod') {
  // if (CROWDAA_REGION === 'fr') { // For debug purposes only
  try {
    const resp = await callBaserowAPI({
      region: CROWDAA_REGION,
      stage: STAGE,
      userId,
      appId,
      name,
      apiKey,
    });

    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response', resp);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log('DEBUG Baserow API response error', e, 'for :', {
      userId,
      appId,
      name,
      apiKey,
    });
  }
  // }
};
