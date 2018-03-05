import { MongoClient } from 'mongodb';

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

export const handleGetBalances = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    const response = {
      statusCode: 403,
      body: 'Forbidden',
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
      message: e.message,
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
      body: 'Forbidden',
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
      message: e.message,
    };
    callback(null, response);
  }
};
