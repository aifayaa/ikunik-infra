/* eslint-disable no-await-in-loop */
import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_PICTURES,
} = process.env;

// TODO: add a check to user permission to access pictures not published
export default async (id, appId, { isPublished }) => {
  let client;
  try {
    const $find = {
      _id: id,
      appId,
    };

    if (typeof isPublished !== 'undefined') {
      $find.isPublished = isPublished;
    }

    client = await MongoClient.connect();
    return await client.db(DB_NAME)
      .collection(COLL_PICTURES)
      .findOne($find);
  } finally {
    client.close();
  }
};
