import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PROFILES,
  COLL_USERS,
} = process.env;

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db(DB_NAME);
  try {
    const [profileFromProfile, [profileFromUser]] = await Promise.all([
      db.collection(COLL_PROFILES)
        .findOne({
          UserId: userId,
          appIds: appId,
        }, { projection: { _id: 1 } }),
      db.collection(COLL_USERS)
        .aggregate([
          {
            $match: {
              _id: userId,
              appIds: appId,
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
        ]).toArray(),
    ]);

    const profile = profileFromProfile || profileFromUser;
    return profile && profile._id;
  } finally {
    client.close();
  }
};
