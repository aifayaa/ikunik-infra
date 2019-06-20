import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default {
  checkPerm: async (appId, userId, userGeneratedContentsId) => {
    const client = await MongoClient.connect(MONGO_URL, {
      useNewUrlParser: true,
    });

    try {
      const result = await client
        .db(DB_NAME)
        .collection(COLL_USER_GENERATED_CONTENTS)
        .findOne({
          _id: userGeneratedContentsId,
          appIds: { $elemMatch: { $eq: appId } },
        });
      console.log(result);
      return result.userId === userId;
    } finally {
      client.close();
    }
  },
  process: async (appId, userId, userGeneratedContentsId) => {
    const client = await MongoClient.connect(MONGO_URL, {
      useNewUrlParser: true,
    });

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
  },
};
