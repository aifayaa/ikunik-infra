/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import defaultReactions from '../../libs/defaultReactions';
import mongoCollections from '../../libs/mongoCollections.json';
import { objGet } from '../../libs/utils';

const { COLL_APPS } = mongoCollections;

export default async (appId, allSettings = false) => {
  let client;
  try {
    client = await MongoClient.connect();

    const application = await client.db().collection(COLL_APPS).findOne({
      _id: appId,
    });

    if (!application) {
      return false;
    }

    const oauth = application.settings.oauth
      ? { url: application.settings.oauth.url }
      : null;

    if (allSettings) {
      return {
        chatengine: application.settings.chatengine,
        internalProfileFields: application.settings.internalProfileFields,
        playlistManagementUrl: application.settings.playlistManagementUrl,
        press: application.settings.press,
        public: application.settings.public,
        oauth,
      };
    }

    const results = {
      name: application.name,
      settings: {
        public: application.settings.public,
        press: {
          env: objGet(application, 'settings.press.env', false),
          aiModerationEnabled: objGet(
            application,
            'settings.press.aiModerationEnabled',
            false
          ),
          moderationRequired: objGet(
            application,
            'settings.press.moderationRequired',
            false
          ),
          reactions: {
            articles: objGet(
              application,
              'settings.press.reactions.articles',
              defaultReactions
            ),
            comments: objGet(
              application,
              'settings.press.reactions.comments',
              defaultReactions
            ),
          },
        },
        googleAnalytics: objGet(application, 'settings.googleAnalytics', {}),
        oauth,
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
          customLogoUrl: application.builds.preview.customLogoUrl,
        };
      }
    }

    return results;
  } finally {
    client.close();
  }
};
