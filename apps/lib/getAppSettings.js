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
      return {
        chatengine: application.settings.chatengine,
        internalProfileFields: application.settings.internalProfileFields,
        playlistManagementUrl: application.settings.playlistManagementUrl,
        press: application.settings.press,
        public: application.settings.public,
      };
    }

    const results = {
      name: application.name,
      settings: {
        public: application.settings.public,
      },
      builds: {},
      public: application.public || {},
    };

    if (application.builds && application.builds.preview) {
      if (application.builds.preview.buildDoneAt) {
        results.builds.preview = {
          buildStartAt: application.builds.preview.buildStartAt,
          buildDoneAt: application.builds.preview.buildDoneAt,
          state: application.builds.preview.state,
        };
      }
    }

    return results;
  } finally {
    client.close();
  }
};
