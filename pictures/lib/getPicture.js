/* eslint-disable no-await-in-loop */
import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PICTURES,
} = process.env;

export default async (id, appId, { isPublished }) => {
  let client;
  try {
    const $find = {
      _id: id,
      appIds: { $elemMatch: { $eq: appId } },
    };

    if (typeof isPublished !== 'undefined') {
      $find.isPublished = isPublished;
    }

    client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
    return await client.db(DB_NAME)
      .collection(COLL_PICTURES)
      .findOne($find);
  } finally {
    client.close();
  }
};
