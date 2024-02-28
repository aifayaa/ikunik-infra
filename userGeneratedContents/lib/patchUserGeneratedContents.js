/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USER_GENERATED_CONTENTS } = mongoCollections;

export default async (appId, userId, userGeneratedContentsId, data) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const userGeneratedContents = {
      data,
      modifiedAt: new Date(),
    };

    const { matchedCount } = await client
      .db()
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        {
          _id: userGeneratedContentsId,
          appId,
        },
        { $set: userGeneratedContents }
      );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
