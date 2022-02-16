import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_CREDITS,
} = mongoCollections;

export default async (userID, appId) => {
  const client = await MongoClient.connect();
  try {
    const credits = await client
      .db()
      .collection(COLL_CREDITS)
      .findOne({
        userID,
        appId,
      });
    return credits || { credits: 0 };
  } finally {
    client.close();
  }
};
