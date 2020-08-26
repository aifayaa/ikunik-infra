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
    valid,
  } = {},
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const $set = {
      reviewed: true,
    };

    if (!valid) {
      $set.moderated = true;

      if (reason) {
        $set.reason = reason;
      }
    }

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
