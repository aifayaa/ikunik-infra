import MongoClient from '../../libs/mongoClient'
import Lambda from 'aws-sdk/clients/lambda';
import moment from 'moment';
import getSubscription from './getSubscription';

const {
  COLL_USER_SUBSCRIPTIONS,
  REGION,
  STAGE,
  DB_NAME,
  MONGO_URL,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

export default async (userId, subId, appId) => {
  const sub = await getSubscription(subId);
  if (!sub) throw new Error('Subscription not found');
  const { price, duration } = sub;
  let client;
  try {
    client = await MongoClient.connect();
    const userSub = await client
      .db(DB_NAME)
      .collection(COLL_USER_SUBSCRIPTIONS)
      .findOne({
        appIds: { $elemMatch: { $eq: appId } },
        expireAt: { $gt: new Date() },
        subscriptionId: subId,
        userId,
      });
    if (userSub) throw new Error('User already subscribed');
    const params = {
      FunctionName: `credits-${STAGE}-getCredits`,
      Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId, appId } } }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const { statusCode, body } = JSON.parse(Payload);
    if (statusCode !== 200) throw new Error(`get credits failed: ${statusCode}`);
    const { credits } = JSON.parse(body);
    if (!credits) throw new Error('unable to get credits from service response');
    if (credits < price) throw new Error('insufficient credits on user account');
    const [value, unit] = duration.split('_');
    const expireAt = moment().add(value, unit).toDate();
    const subscription = {
      userId,
      expireAt,
      subscriptionId: subId,
      createdAt: new Date(),
      amount: price,
      appIds: [appId],
    };
    const { insertedId } = await client
      .db(DB_NAME)
      .collection(COLL_USER_SUBSCRIPTIONS)
      .insertOne(subscription);
    const credParams = {
      FunctionName: `credits-${STAGE}-removeCredits`,
      Payload: JSON.stringify({ userId, appId, amount: `${price}` }),
    };
    const credRes = await lambda.invoke(credParams).promise();
    const res = JSON.parse(credRes.Payload);
    if (res.statusCode !== 200) {
      throw new Error(`removeCredits handler failed: ${res.body}`);
    }
    return { _id: insertedId, expireAt };
  } finally {
    client.close();
  }
};
