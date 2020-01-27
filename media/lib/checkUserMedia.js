import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_AUDIOS,
  COLL_VIDEOS,
} = process.env;
export default async (userId, appId, mediaIds) => {
  const client = await MongoClient.connect();
  try {
    const audios = await client
      .db(DB_NAME)
      .collection(COLL_AUDIOS)
      .find({
        _id: { $in: mediaIds },
        fromUserId: { $ne: userId },
        appIds: { $elemMatch: { $eq: appId } },
      })
      .count();
    const videos = await client
      .db(DB_NAME)
      .collection(COLL_VIDEOS)
      .find({
        _id: { $in: mediaIds },
        fromUserId: { $ne: userId },
        appIds: { $elemMatch: { $eq: appId } },
      })
      .count();
    return audios === 0 && videos === 0;
  } finally {
    client.close();
  }
};
