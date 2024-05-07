/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (orgId) => {
  const client = await MongoClient.connect();

  try {
    const apps = await client
      .db()
      .collection(COLL_APPS)
      .find(
        { 'organization._id': orgId },
        {
          projection: {
            credentials: 0,
            backend: 0,
            'builds.android.googleApiData': 0,
            'builds.android.firebase': 0,
            'settings.iap': 0,
            'settings.chatengine': 0,
            'settings.userDataCollection': 0,
            'settings.saml': 0,
          },
        }
      )
      .toArray();

    return apps;
  } finally {
    client.close();
  }
};
