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

export const handleGetBalances = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
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
