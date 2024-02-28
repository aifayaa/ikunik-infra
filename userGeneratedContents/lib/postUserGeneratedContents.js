/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getAppSettings from '../../apps/lib/getAppSettings';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (
  appId,
  parentId,
  parentCollection,
  rootParentId,
  rootParentCollection,
  userId,
  type,
  data
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const appSettings = (await getAppSettings(appId, true)) || {};
    const { moderationRequired } = appSettings.press || {};

    /* Otherwise, insert the category to the database and return it */
    const userGeneratedContents = {
      _id: uuid.v4(),
      parentId,
      parentCollection,
      rootParentId,
      rootParentCollection,
      userId,
      appId,
      type,
      data,
      trashed: false,
      createdAt: new Date(),
      modifiedAt: false,
    };

    if (moderationRequired) {
      userGeneratedContents.reviewed = false;
    }

    const _id = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .insertOne(userGeneratedContents);

    return { _id, ...userGeneratedContents };
  } finally {
    client.close();
  }
};
