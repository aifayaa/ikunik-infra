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
  data,
) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    const existingUserGeneratedContents = await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .findOne({
        _id: userGeneratedContentsId,
        appIds: { $elemMatch: { $eq: appId } },
      });

    if (!existingUserGeneratedContents) {
      throw new Error('content_not_found');
    }

    if (existingUserGeneratedContents.userId !== userId) {
      throw new Error('forbidden_user');
    }

    const userGeneratedContents = {
      data,
    };

    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        {
          _id: userGeneratedContentsId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        { $set: userGeneratedContents },
      );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
