import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_CREDITS,
} = process.env;

export default async (userID, appId) => {
  const client = await MongoClient.connect();
  try {
    const credits = await client
      .db(DB_NAME)
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
