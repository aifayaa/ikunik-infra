import { MongoClient } from 'mongodb';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const record = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
      .aggregate([
        { $match: { _id: userId } },
        {
          $lookup: {
            from: process.env.COLL_BALANCE_EMAILS,
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
            from: process.env.COLL_BALANCE_MESSAGES,
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
            from: process.env.COLL_BALANCE_NOTIFS,
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
          $match: {
            'emailsBalance.appIds': { $elemMatch: { $eq: appId } },
            'textMessagesBalance.appIds': { $elemMatch: { $eq: appId } },
            'notificationsBalance.appIds': { $elemMatch: { $eq: appId } },
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
