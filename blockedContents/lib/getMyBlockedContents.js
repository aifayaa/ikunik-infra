/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import allowedTypes from './blockedContentTypes.json';

const { COLL_BLOCKED_CONTENTS } = mongoCollections;

export default async (userId, { appId }) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const blockedContents = await db
      .collection(COLL_BLOCKED_CONTENTS)
      .find({
        appId,
        userId,
      })
      .toArray();

    const mappedForOutput = blockedContents
      .map(({ contentId, type }) => {
        if (!allowedTypes[type]) return false;

        return {
          contentId,
          type,
        };
      })
      .filter((x) => x);

    return mappedForOutput;
  } finally {
    client.close();
  }
};
