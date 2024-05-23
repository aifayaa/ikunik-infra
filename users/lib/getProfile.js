/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PROFILES, COLL_USERS } = mongoCollections;

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db();
  try {
    const [profileFromProfile, [profileFromUser]] = await Promise.all([
      db.collection(COLL_PROFILES).findOne(
        {
          UserId: userId,
          appId,
        },
        { projection: { _id: 1 } }
      ),
      db
        .collection(COLL_USERS)
        .aggregate([
          {
            $match: {
              _id: userId,
              appId,
            },
          },
          {
            $limit: 1,
          },
          {
            $lookup: {
              from: COLL_PROFILES,
              localField: 'profil_ID',
              foreignField: '_id',
              as: 'profile',
            },
          },
          {
            $unwind: '$profile',
          },
          {
            $replaceRoot: {
              newRoot: '$profile',
            },
          },
        ])
        .toArray(),
    ]);

    return profileFromProfile || profileFromUser;
  } finally {
    client.close();
  }
};
