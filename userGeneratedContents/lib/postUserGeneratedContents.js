/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getAppSettings from '../../apps/lib/getAppSettings';
import {
  getUGCDefaultOffensiveField,
  isOffensiveMaterialFilteringEnabled,
  startAiModerationForUgc,
} from './aiModerationTools.ts';
import { DEFAULT_APP_SETTINGS } from '../../apps/lib/createApp';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (
  appId,
  parentId,
  parentCollection,
  rootParentId,
  rootParentCollection,
  userId,
  type,
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

    const _id = uuid.v4();

    const aiModerationEnabled = isOffensiveMaterialFilteringEnabled();
    const offensive = getUGCDefaultOffensiveField();

    /* Otherwise, insert the category to the database and return it */
    const userGeneratedContents = {
      _id,
      parentId,
      parentCollection,
      rootParentId,
      rootParentCollection,
      userId,
      appId,
      type,
      data,
      lang,
      trashed: false,
      createdAt: new Date(),
      modifiedAt: false,
      offensive,
    };

    if (moderationRequired) {
      userGeneratedContents.reviewed = false;
    }

    await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .insertOne(userGeneratedContents);

    if (aiModerationEnabled) {
      await startAiModerationForUgc(_id);
    }

    return { _id, ...userGeneratedContents };
  } finally {
    client.close();
  }
};
