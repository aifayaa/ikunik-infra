import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const app = await client
      .db()
      .collection(COLL_APPS)
      .findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    const status = {
      id: app._id,
      name: app.name,
      builds: false,
      buildIos: false,
      buildAndroid: false,
      previewKey: false,
    };

    if (app.builds) {
      if (app.builds.ios) {
        status.buildIos = true;
        status.builds = true;
      }
      if (app.builds.android) {
        status.buildAndroid = true;
        status.builds = true;
      }
    }

    if (app.settings) {
      if (app.settings.previewKey) {
        status.previewKey = app.settings.previewKey;
      }
    }

    return (status);
  } finally {
    client.close();
  }
};
