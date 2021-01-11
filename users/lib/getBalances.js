import MongoClient from '../../libs/mongoClient';

export default async (profileId, appId) => {
  const client = await MongoClient.connect();
  try {
    const record = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_PROFILES)
      .aggregate([
        { $match: { _id: profileId } },
        {
          $lookup: {
            from: process.env.COLL_BALANCE_EMAILS,
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'emailsBalance',
          },
        },
        {
          $addFields: {
            emailsBalance: {
              $filter: {
                input: '$emailsBalance',
                as: 'balance',
                cond: { $eq: [appId, '$$balance.appId'] },
              },
            },
          },
        },
        {
          $lookup: {
            from: process.env.COLL_BALANCE_MESSAGES,
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'textMessagesBalance',
          },
        },
        {
          $addFields: {
            textMessagesBalance: {
              $filter: {
                input: '$textMessagesBalance',
                as: 'balance',
                cond: { $eq: [appId, '$$balance.appId'] },
              },
            },
          },
        },
        {
          $lookup: {
            from: process.env.COLL_BALANCE_NOTIFS,
            localField: '_id',
            foreignField: 'profil_ID',
            as: 'notificationsBalance',
          },
        },
        {
          $addFields: {
            notificationsBalance: {
              $filter: {
                input: '$notificationsBalance',
                as: 'balance',
                cond: { $eq: [appId, '$$balance.appId'] },
              },
            },
          },
        },
        {
          $unwind: {
            path: '$emailsBalance',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$textMessagesBalance',
            preserveNullAndEmptyArrays: true,
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
              $cond: {
                if: {
                  $gt: ['$emailsBalance.balance', 0],
                },
                then: '$emailsBalance.balance',
                else: 0,
              },
            },
            textMessagesBalance: {
              $cond: {
                if: {
                  $gt: ['$textMessagesBalance.balance', 0],
                },
                then: '$textMessagesBalance.balance',
                else: 0,
              },
            },
            notificationsBalance: {
              $cond: {
                if: {
                  $gt: ['$notificationsBalance.balance', 0],
                },
                then: '$notificationsBalance.balance',
                else: 0,
              },
            },
          },
        },
      ]).toArray();
    return record[0];
  } finally {
    client.close();
  }
};
