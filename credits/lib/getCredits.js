import MongoClient from '../../libs/mongoClient'

const {
  MONGO_URL,
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
        appIds: { $elemMatch: { $eq: appId } },
      });
    return credits;
  } finally {
    client.close();
  }
};
