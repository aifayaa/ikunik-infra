/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (userId, appId, active) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user] = await Promise.all([
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
          'credentials.chatengine': { $exists: true },
        },
        {
          projection: {
            'credentials.chatengine': 1,
          },
        }
      ),
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
          'services.chatengine': { $exists: true },
        },
        {
          projection: {
            'services.chatengine': 1,
            profile: 1,
          },
        }
      ),
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('user_not_found');

    let lastActivity;
    if (active) {
      lastActivity = new Date();
    } else {
      lastActivity = null;
    }

    await db.collection(COLL_USERS).updateOne(
      {
        _id: userId,
        appId,
      },
      {
        $set: {
          'services.chatengine.lastActivity': lastActivity,
        },
      }
    );
  } finally {
    client.close();
  }
};
