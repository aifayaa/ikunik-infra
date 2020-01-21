import Lambda from 'aws-sdk/clients/lambda';
import addBlastToken from './addBlastToken';
import getPackage from './getPackage';
import logTokenPurchase from './logTokenPurchase';

const {
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (userId, packageId, appId) => {
  const pack = await getPackage(packageId, appId);
  if (!pack) throw new Error('unknown package');
  const { qty, price, type } = pack;

  let res = await lambda.invoke({
    FunctionName: `users-${STAGE}-getProfile`,
    Payload: JSON.stringify({
      pathParameters: { id: userId },
      requestContext: { authorizer: { principalId: userId, appId } },
    }),
  }).promise();
  const { StatusCode } = res;
  let { Payload } = res;
  if (StatusCode !== 200) throw new Error('failed to get profile');
  const { body } = JSON.parse(Payload);
  if (!body) throw new Error('wrong profile');
  const profileId = JSON.parse(body)._id;
  if (!profileId) throw new Error('wrong profile');

  let params = {
    FunctionName: `credits-${STAGE}-getCredits`,
    Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId, appId } } }),
  };
  ({ Payload } = await lambda.invoke(params).promise());
  const resCredits = JSON.parse(Payload);
  const { statusCode } = resCredits;
  if (statusCode !== 200) throw new Error(`get credits failed: ${statusCode}`);
  const { credits } = JSON.parse(resCredits.body);
  if (!credits) throw new Error('unable to get credits from service response');
  if (credits < price) throw new Error('insufficient credits on user account');

  await addBlastToken(type, profileId, qty);

  params = {
    FunctionName: `credits-${STAGE}-removeCredits`,
    Payload: JSON.stringify({ userId, appId, amount: `${price}` }),
  };
  res = await lambda.invoke(params).promise();
  res = JSON.parse(res.Payload);
  if (res.statusCode !== 200) {
    throw new Error(`removeCredits handler failed: ${res.body}`);
  }

  await logTokenPurchase(pack, userId, profileId, appId);
  return true;
};
