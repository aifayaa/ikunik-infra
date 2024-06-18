/* eslint-disable import/no-relative-packages */
import request from 'request-promise-native';
import { UTMType, UserProfileType } from '../../../users/lib/userEntity';

const { CROWDAA_REGION, STAGE } = process.env;

const BASEROW_URL =
  STAGE === 'prod'
    ? 'http://automation.operations.aws.crowdaa.com/webhook/createCustomerCrowdaa-mdfi-pd2645-95dg-dol9'
    : 'http://automation.operations.aws.crowdaa.com/webhook-test/createCustomerCrowdaa-mdfi-pd2645-95dg-dol9';
const BASEROW_METHOD = 'POST';

async function callBaserowAPI(data: Object) {
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
  // if (STAGE === 'prod') {
  // if (CROWDAA_REGION === 'fr') { // For debug purposes only
  try {
    const extra = utm ? { utm } : {};
    const resp = await callBaserowAPI({
      ...{
        region: CROWDAA_REGION,
        stage: STAGE,
        userId,
        email,
        username,
        profile,
      },
      ...extra,
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
      utm,
    });
  }
  // }
};
