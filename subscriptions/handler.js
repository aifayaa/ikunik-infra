import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';
import moment from 'moment';

const lambda = new Lambda({
  region: process.env.REGION,
});

const doGetSubscription = async (subId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const sub = await client.db(process.env.DB_NAME).collection('subscriptions')
      .findOne({ _id: subId });
    return sub;
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
};

const doGetUserSubscriptions = async (userId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const res = await client.db(process.env.DB_NAME).collection('userSubscriptions')
      .aggregate([
        { $match: { userId } },
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription',
          },
        },
        {
          $unwind: {
            path: '$subscriptions', preserveNullAndEmptyArrays: true,
          },
        },
      ]).toArray();
    return { subscriptions: res };
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
};

const doSubscribe = async (userId, subId) => {
  const sub = await doGetSubscription(subId);
  if (!sub) throw new Error('Subscription not found');
  const { price, duration } = sub;
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const userSub = await client.db(process.env.DB_NAME).collection('userSubscriptions')
      .findOne({ userId, subscriptionId: subId });
    if (userSub) throw new Error('User already subscribed');
    const params = {
      FunctionName: `credits-${process.env.STAGE}-getCredits`,
      Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId } } }),
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
    };
    const { insertedId } = await client.db(process.env.DB_NAME).collection('userSubscriptions')
      .insertOne(subscription);
    const credParams = {
      FunctionName: `credits-${process.env.STAGE}-removeCredits`,
      Payload: JSON.stringify({ userId, amount: `${price}` }),
    };
    const credRes = await lambda.invoke(credParams).promise();
    const res = JSON.parse(credRes.Payload);
    if (res.statusCode !== 200) {
      throw new Error(`removeCredits handler failed: ${res.body}`);
    }
    return { _id: insertedId, expireAt };
  } catch (e) {
    throw e;
  } finally {
    client.close();
  }
};

export const handleGetSubscription = async (event, context, callback) => {
  try {
    const subId = event.pathParameters.id;
    const results = await doGetSubscription(subId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handleGetUserSubscriptions = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: JSON.stringify({ message: 'Forbidden' }),
    };
    callback(null, response);
    return;
  }
  try {
    const results = await doGetUserSubscriptions(userId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};

export const handlePostSubscription = async (event, context, callback) => {
  try {
    const subId = event.pathParameters.id;
    const userId = event.requestContext.authorizer.principalId;
    const results = await doSubscribe(userId, subId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};
