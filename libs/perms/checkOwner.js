import MongoClient from '../mongoClient';

const {
  DB_NAME,
} = process.env;

export default async (
  appId,
  objId,
  collectionName,
  collectionField,
  userId,
  options = {
    useTrashedField: true,
  },
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

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
      throw new Error('content_not_found');
    }

    if (obj[collectionField] !== userId) {
      throw new Error('forbidden_user');
    }

    return obj;
  } finally {
    client.close();
  }
};
