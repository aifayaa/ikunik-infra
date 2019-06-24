import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (appId, parentId, parentCollection) => {
  let client;
  try {
    client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
    return await client.db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .find({
        parentId,
        parentCollection,
        appIds: { $elemMatch: { $eq: appId } },
      })
      .toArray();
  } finally {
    client.close();
  }
};
