/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_TOS } = mongoCollections;

export default async (appId, tosId, userId, fieldsToSet) => {
  const client = await MongoClient.connect();
  try {
    await client
      .db()
      .collection(COLL_TOS)
      .updateOne(
        { _id: tosId, appId },
        {
          $set: {
            ...fieldsToSet,
            updatedAt: new Date(),
            updatedBy: userId,
          },
        }
      );

    const modifiedTos = await client
      .db()
      .collection(COLL_TOS)
      .findOne({ _id: tosId, appId });

    return modifiedTos;
  } finally {
    client.close();
  }
};
