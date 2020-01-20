import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_APPS,
} = process.env;

export default async (appId) => {
  let client;
  try {
    client = await MongoClient.connect();

    const application = await client.db(DB_NAME)
      .collection(COLL_APPS)
      .findOne({
        _id: appId,
      });

    if (!application) {
      return false;
    }

    const results = {
      name: application.name,
      settings: {
        public: application.settings.public,
      },
    };

    return results;
  } finally {
    client.close();
  }
};
