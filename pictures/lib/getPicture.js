/* eslint-disable no-await-in-loop */
import { MongoClient } from 'mongodb';

const INTERVAL = 1000;

export default async (id, appId, { waitCreation }) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    let picture = null;
    let loop = false;
    do {
      picture = await client.db(process.env.DB_NAME)
        .collection(process.env.COLL_PICTURES)
        .findOne({
          _id: id,
          appIds: { $elemMatch: { $eq: appId } },
          isPublished: true,
        });
      if (waitCreation === 'true') {
        loop = !picture;
        await new Promise((resolve) => {
          setTimeout(resolve, INTERVAL);
        });
      }
    } while (loop);
    return picture;
  } finally {
    client.close();
  }
};
