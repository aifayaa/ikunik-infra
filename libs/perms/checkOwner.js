import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
} = process.env;

export default async (
  appId,
  objId,
  collectionName,
  collectionField,
  userId,
  options = { useTrashedField: true },
) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });

  try {
    const findObj = {
      _id: objId,
      appIds: { $elemMatch: { $eq: appId } },
    };

    if (options.useTrashedField) {
      findObj.trashed = false;
    }

    const obj = await client
      .db(DB_NAME)
      .collection(collectionName)
      .findOne(findObj);

    if (!obj) {
      return { code: 404, message: 'content_not_found' };
    }

    if (obj[collectionField] !== userId) {
      return { code: 403, message: 'forbidden_user' };
    }

    return true;
  } finally {
    client.close();
  }
};
