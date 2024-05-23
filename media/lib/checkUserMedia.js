/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_AUDIOS, COLL_VIDEOS } = mongoCollections;

export default async (userId, appId, mediaIds) => {
  const client = await MongoClient.connect();
  try {
    const audios = await client
      .db()
      .collection(COLL_AUDIOS)
      .find({
        _id: { $in: mediaIds },
        fromUserId: { $ne: userId },
        appId,
      })
      .count();
    const videos = await client
      .db()
      .collection(COLL_VIDEOS)
      .find({
        _id: { $in: mediaIds },
        fromUserId: { $ne: userId },
        appId,
      })
      .count();
    return audios === 0 && videos === 0;
  } finally {
    client.close();
  }
};
