import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_VIDEOS,
} = process.env;

// TODO: add a check to user permission to access videos not published
export default async (id, appId, { isPublished }) => {
  let client;
  try {
    const $find = {
      _id: id,
      appIds: appId,
    };

    if (typeof isPublished !== 'undefined') {
      $find.isPublished = isPublished;
    }

    client = await MongoClient.connect();
    const video = await client.db(DB_NAME)
      .collection(COLL_VIDEOS)
      .findOne($find);

    if (!video) {
      return (null);
    }

    return (video.thumbUrl || null);
  } finally {
    client.close();
  }
};
