/* eslint-disable no-await-in-loop */
import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PICTURES,
} = process.env;

// TODO: add a check to user permission to access pictures not published
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

    client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;
    return await client.db(DB_NAME)
      .collection(COLL_PICTURES)
      .findOne($find);
  } finally {
    client.close();
  }
};
