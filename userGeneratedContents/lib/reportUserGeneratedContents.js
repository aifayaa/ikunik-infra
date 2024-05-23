/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS, COLL_USER_GENERATED_CONTENTS_REPORTS } =
  mongoCollections;

export default async (appId, userId, ugcId, reason, details) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    /* Check if that UGC exists in that appId */
    const ugc = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .findOne({
        _id: ugcId,
        appId,
      });

    if (!ugc) {
      throw new Error('ugc_not_found');
    }

    /* Prepare the report for insertion */
    const ugcReport = {
      _id: uuid.v4(),
      appId,
      createdAt: new Date(),
      details,
      reason,
      ugcId,
      userId,
    };

    /* Insert report in database */
    const _id = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS_REPORTS)
      .insertOne(ugcReport);

    /* Return id and report information */
    return { _id, ...ugcReport };
  } finally {
    client.close();
  }
};
