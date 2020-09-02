import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (
  appId,
  userId,
  ugc,
  {
    reason = '',
    moderated,
  } = {},
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const $set = {
      moderated,
      reason,
      reviewed: true,
    };

    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne(
        {
          _id: ugc._id,
          appIds: appId,
        },
        { $set },
      );

    return !!matchedCount;
  } finally {
    client.close();
  }
};
