/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (appId, userId, ugc, { reason = '', moderated } = {}) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const $set = {
      moderated,
      reason,
      reviewed: true,
    };

    const { matchedCount } = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        {
          _id: ugc._id,
          appId,
        },
        { $set }
      );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
