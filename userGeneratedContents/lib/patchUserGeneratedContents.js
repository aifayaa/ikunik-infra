/* eslint-disable import/no-relative-packages */
import getAppSettings from '../../apps/lib/getAppSettings';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import {
  isOffensiveMaterialFilteringEnabled,
  synchronousUgcAnalyze,
} from './aiModerationTools.ts';
import { DEFAULT_APP_SETTINGS } from '../../apps/lib/createApp';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (
  appId,
  userId,
  userGeneratedContentsId,
  data,
  lang = 'en'
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const appSettings = (await getAppSettings(appId, true)) || {};
    const {
      moderationRequired = DEFAULT_APP_SETTINGS.press.moderationRequired,
    } = appSettings.press || {};

    const userGeneratedContents = {
      data,
      modifiedAt: new Date(),
      lang,
    };

    if (moderationRequired) {
      userGeneratedContents.reviewed = false;
    }

    const { modifiedCount } = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        {
          _id: userGeneratedContentsId,
          appId,
        },
        { $set: userGeneratedContents }
      );

    const aiModerationEnabled = isOffensiveMaterialFilteringEnabled();
    if (modifiedCount > 0 && aiModerationEnabled) {
      await synchronousUgcAnalyze(userGeneratedContentsId);
    }

    const modifiedUgc = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .findOne({
        _id: userGeneratedContentsId,
        appId,
      });

    return modifiedUgc;
  } finally {
    client.close();
  }
};
