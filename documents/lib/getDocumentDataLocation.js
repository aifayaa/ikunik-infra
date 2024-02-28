/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_DOCUMENTS } = mongoCollections;

// TODO: add a check to user permission to access documents not published
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
    const document = await client
      .db()
      .collection(COLL_DOCUMENTS)
      .findOne($find);

    if (!document) {
      return null;
    }

    return document.url || null;
  } finally {
    client.close();
  }
};
