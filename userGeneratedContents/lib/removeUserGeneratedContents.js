import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_USER_GENERATED_CONTENTS,
} = process.env;

export default async (
  appId,
  userId,
  userGeneratedContentsId,
  { moderationInfo = '' } = {},
) => {
  /* Mongo client */
  const client = await MongoClient.connect();
  try {
    const patch = {
      $set: {
        trashed: true,
        removedBy: userId,
        removedAt: new Date(),
      },
    };
    if (moderationInfo) {
      patch.$set.moderationInfo = moderationInfo;
    }
    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_USER_GENERATED_CONTENTS)
      .updateOne({
        _id: userGeneratedContentsId,
        appIds: { $elemMatch: { $eq: appId } },
      }, patch);
    return !!matchedCount;
  } finally {
    client.close();
  }
};
