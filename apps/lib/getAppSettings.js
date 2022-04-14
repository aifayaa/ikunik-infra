import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_APPS,
} = mongoCollections;

export default async (appId, allSettings = false) => {
  let client;
  try {
    client = await MongoClient.connect();

    const application = await client.db()
      .collection(COLL_APPS)
      .findOne({
        _id: appId,
      });

    if (!application) {
      return false;
    }

    if (allSettings) {
      return application.settings;
    }

    const results = {
      name: application.name,
      settings: {
        public: application.settings.public,
      },
      public: application.public || {},
    };

    return results;
  } finally {
    client.close();
  }
};
