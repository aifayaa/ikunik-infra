/* eslint-disable import/no-relative-packages */
import { AppType } from '@apps/lib/appEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { UserType } from '@users/lib/userEntity';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (userId: string, appId: string) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user] = await Promise.all([
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
          'credentials.firebase.webAppConfig': { $exists: true },
        },
        {
          projection: {
            'credentials.firebase': 1,
          },
        }
      ) as Promise<AppType>,
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
        },
        {
          projection: {
            _id: 1,
          },
        }
      ) as Promise<UserType>,
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('user_not_found');

    await db.collection(COLL_USERS).updateOne(
      {
        _id: userId,
        appId,
      },
      {
        $set: {
          'services.firebaseChat.lastActivity': new Date(),
        },
      }
    );
  } finally {
    await client.close();
  }
};
