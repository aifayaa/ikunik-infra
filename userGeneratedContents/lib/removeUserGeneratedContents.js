import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (
  appId,
  userId,
  userGeneratedContentsId,
) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const result = await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .deleteOne({
        _id: userGeneratedContentsId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return { result };
  } finally {
    client.close();
  }
};
