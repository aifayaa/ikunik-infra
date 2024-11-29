/* eslint-disable import/no-relative-packages */
/* eslint-disable no-await-in-loop */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PICTURES } = mongoCollections;

// TODO: add a check to user permission to access pictures not published
export default async (appId, { start, limit }) => {
  let client;
  try {
    client = await MongoClient.connect();

    const promises = [
      client.db().collection(COLL_PICTURES).find({ appId }).count(),
      client
        .db()
        .collection(COLL_PICTURES)
        .find({ appId })
        .sort([['createdAt', -1]])
        .skip(start)
        .limit(limit)
        .toArray(),
    ];

    const [count, list] = await Promise.all(promises);

    return { count, list };
  } finally {
    client.close();
  }
};
