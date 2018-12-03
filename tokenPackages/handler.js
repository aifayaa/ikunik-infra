import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';

const lambda = new Lambda({
  region: process.env.REGION,
});

const doGetPackages = async (opts) => {
  let client;
  try {
    const selector = {};
    if (opts.type) selector.type = opts.type;
    client = await MongoClient.connect(process.env.MONGO_URL);
    const packages = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(selector).toArray();
    return { packages };
  } finally {
    client.close();
  }
};

const doGetPackage = async (packageId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    return await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ _id: packageId });
  } finally {
    client.close();
  }
};

const doAddBlastToken = async (type, profileId, qty) => {
  let client;
  let collName;
  switch (type) {
    case 'email':
      collName = 'artistEmailsBalance';
      break;
    case 'notification':
      collName = 'artistNotificationBalance';
      break;
    case 'text':
      collName = 'artistTextMessageBalance';
      break;
    default:
  }
  try {
    client = await MongoClient.connect(process.env.MONGO_URL);
    const res = await client.db(process.env.DB_NAME).collection(collName)
      .updateOne({ profil_ID: profileId }, {
        $inc: {
          balance: Number(qty),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      console.log(`increment ${profileId} of ${qty} ${type} tokens`);
      return true;
    }
    throw new Error('No profile found');
  } finally {
    client.close();
  }
};

const doLogTokenPurchase = async (pack, userId, profileId) => {
  let client;
  try {
    const purchase = pack;
    delete purchase._id;
    purchase.userId = userId;
    purchase.profileId = profileId;
    purchase.date = new Date();

    client = await MongoClient.connect(process.env.MONGO_URL);
    await client.db(process.env.DB_NAME).collection('purchasesPackages')
      .insertOne(purchase);
    return true;
  } finally {
    client.close();
  }
};

const doBuyPackages = async (userId, packageId) => {
  try {
    const pack = await doGetPackage(packageId);
    if (!pack) throw new Error('unknow package');
    const { qty, price, type } = pack;

    let res = await lambda.invoke({
      FunctionName: `users-${process.env.STAGE}-getProfile`,
      Payload: JSON.stringify({
        pathParameters: { id: userId },
        requestContext: { authorizer: { principalId: userId } },
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
      FunctionName: `credits-${process.env.STAGE}-getCredits`,
      Payload: JSON.stringify({ requestContext: { authorizer: { principalId: userId } } }),
    };
    ({ Payload } = await lambda.invoke(params).promise());
    const resCredits = JSON.parse(Payload);
    const { statusCode } = resCredits;
    if (statusCode !== 200) throw new Error(`get credits failed: ${statusCode}`);
    const { credits } = JSON.parse(resCredits.body);
    if (!credits) throw new Error('unable to get credits from service response');
    if (credits < price) throw new Error('insufficient credits on user account');

    await doAddBlastToken(type, profileId, qty);

    params = {
      FunctionName: `credits-${process.env.STAGE}-removeCredits`,
      Payload: JSON.stringify({ userId, amount: `${price}` }),
    };
    res = await lambda.invoke(params).promise();
    res = JSON.parse(res.Payload);
    if (res.statusCode !== 200) {
      throw new Error(`removeCredits handler failed: ${res.body}`);
    }

    await doLogTokenPurchase(pack, userId, profileId);
    return true;
  } catch (e) {
    throw e;
  }
};

export const handleGetPackages = async (event, context, callback) => {
  try {
    const results = await doGetPackages(event.queryStringParameters || {});
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};

export const handleBuyPackages = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const packageId = event.pathParameters.id;
    if (!packageId) {
      throw new Error('mal formed request');
    }

    const results = await doBuyPackages(userId, packageId);
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
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
