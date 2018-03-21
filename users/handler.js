import { MongoClient } from 'mongodb';
import validator from 'validator';
import Lambda from 'aws-sdk/clients/lambda';

const lambda = new Lambda({
  region: process.env.REGION,
});

const doGetBalances = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const record = await client.db(process.env.DB_NAME).collection('users')
      .aggregate([
        { $match: { _id: userId } },
        {
          $lookup: {
            from: 'artistEmailsBalance',
            localField: 'profil_ID',
            foreignField: 'profil_ID',
            as: 'emailsBalance',
          },
        },
        {
          $unwind: {
            path: '$emailsBalance',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'artistTextMessageBalance',
            localField: 'profil_ID',
            foreignField: 'profil_ID',
            as: 'textMessagesBalance',
          },
        },
        {
          $unwind: {
            path: '$textMessagesBalance',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'artistNotificationBalance',
            localField: 'profil_ID',
            foreignField: 'profil_ID',
            as: 'notificationsBalance',
          },
        },
        {
          $unwind: {
            path: '$notificationsBalance',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            emailsBalance: {
              $cond: { if: { $gt: ['$emailsBalance.balance', 0] }, then: '$emailsBalance.balance', else: 0 },
            },
            textMessagesBalance: {
              $cond: { if: { $gt: ['$textMessagesBalance.balance', 0] }, then: '$textMessagesBalance.balance', else: 0 },
            },
            notificationsBalance: {
              $cond: { if: { $gt: ['$notificationsBalance.balance', 0] }, then: '$notificationsBalance.balance', else: 0 },
            },
          },
        },
      ]).toArray();
    return record[0];
  } finally {
    client.close();
  }
};

const doGetPurchases = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const record = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate([
        { $match: { UserId: userId } },
        {
          $lookup: {
            from: 'Project',
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'projects',
          },
        },
        {
          $unwind: {
            path: '$projects',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'purchases',
            localField: 'projects._id',
            foreignField: 'purchase.project_ID',
            as: 'purchases',
          },
        },
        {
          $unwind: {
            path: '$purchases',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            projects: 1,
            purchases: { $ifNull: ['$purchases', { purchase: { project_ID: '$projects._id' } }] },
          },
        },
        {
          $group: {
            _id: '$purchases.purchase.project_ID',
            projectName: { $first: '$projects.projectName' },
            purchases: { $sum: '$purchases.purchase.price' },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$purchases' },
            projects: { $push: { _id: '$_id', projectName: '$projectName', purchases: '$purchases' } },
          },
        },
        {
          $project: {
            _id: 0,
            total: 1,
            projects: 1,
            unity: { $literal: 'credits' },
            symbol: { $literal: 'credits' },
          },
        },
      ]).toArray();
    return record[0];
  } finally {
    client.close();
  }
};

const doGetPayouts = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const record = await client.db(process.env.DB_NAME).collection('profil')
      .aggregate([
        { $match: { UserId: userId } },
        {
          $lookup: {
            from: 'payouts',
            localField: '_id',
            foreignField: 'profileId',
            as: 'payouts',
          },
        },
        {
          $unwind: {
            path: '$payouts',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: null,
            totalBaseAmount: { $sum: '$payouts.baseAmount' },
            totalFees: { $sum: '$payouts.fees' },
            totalCrowdaa: { $sum: '$payouts.crowdaa' },
            totalIncome: { $sum: '$payouts.income' },
            payouts: { $push: '$payouts' },
          },
        },
        {
          $project: {
            _id: 0,
            totalBaseAmount: 1,
            totalFees: 1,
            totalCrowdaa: 1,
            totalIncome: 1,
            payouts: 1,
            unity: { $literal: 'credits' },
            symbol: { $literal: 'credits' },
          },
        },
      ]).toArray();
    return record[0];
  } finally {
    client.close();
  }
};

const doGetProfile = async (userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const profile = await client.db(process.env.DB_NAME).collection('profil')
      .findOne({ UserId: userId });
    return profile;
  } finally {
    client.close();
  }
};

const doGetPaymentInfoByMethod = async (userId, method, profile) => {
  let wProfile;
  if (method === 'paypal' || method === 'btc') {
    wProfile = profile || await doGetProfile(userId);
    if (!wProfile) throw new Error('no profile found');
  }
  switch (method) {
    case 'paypal':
      if (!wProfile.payPalEmail) throw new Error('no paypal account found');
      return wProfile.payPalEmail;
    case 'credits':
      return userId;
    case 'btc':
      if (!wProfile.btcAddress) throw new Error('no bitcoin address account found');
      return wProfile.btcAddress;
    default:
      throw new Error(`payment method ${method} not supported yet`);
  }
};

const doAskPayout = async (userId, amount, method) => {
  const payouts = await doGetPayouts(userId);
  const purchases = await doGetPurchases(userId);
  const maxDemand = purchases.total - payouts.totalBaseAmount;
  if (!validator.isInt(amount, {
    min: process.env.MINIMUM_PAYOUT,
    allow_leading_zeroes: false,
    max: maxDemand,
  })) {
    throw new Error('Wrong amount');
  }
  const profile = await doGetProfile(userId);
  if (!profile) throw new Error('no profile found');

  const params = {
    FunctionName: `fees-${process.env.STAGE}-getFees`,
  };
  const { Payload } = await lambda.invoke(params).promise();
  const res = JSON.parse(Payload);
  if (res.statusCode !== 200) {
    throw new Error(`getFees handler failed: ${res.body}`);
  }
  const feesPercentage = JSON.parse(res.body).globalAvgFees / 100;
  const fees = Number(Math.round(feesPercentage * amount));
  const crowdaa = Number(Math.round(process.env.CROWDAA_FEES * (amount - fees)));
  const payoutData = {
    method,
    userId,
    fees,
    crowdaa,
    date: new Date(),
    baseAmount: Number(amount),
    income: Number((amount - fees - crowdaa)),
    receiver: await doGetPaymentInfoByMethod(userId, method, profile),
    state: 'pending',
    profileId: profile._id,
  };

  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    await client.db(process.env.DB_NAME).collection('payouts')
      .insertOne(payoutData);
    return true;
  } finally {
    client.close();
  }
};

export const handleGetBalances = async (event, context, callback) => {
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
    const results = await doGetBalances(userId);
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

export const handleGetPurchases = async (event, context, callback) => {
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
    const results = await doGetPurchases(userId);
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

export const handleGetPayouts = async (event, context, callback) => {
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
    const results = await doGetPayouts(userId);
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

export const handleAddPayout = async (event, context, callback) => {
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
    const { amount, method } = JSON.parse(event.body);
    if (!amount || !method) {
      throw new Error('Bad arguments');
    }
    const results = await doAskPayout(userId, amount, method);
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

export const handleGetProfile = async (event, context, callback) => {
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
    const results = await doGetProfile(userId);
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
