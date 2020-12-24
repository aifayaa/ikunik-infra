import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';

const { DB_NAME } = process.env;

export default async (userId, appId, file) => {
  const client = await MongoClient.connect();

  const { type, id } = file;
  const collection = getCollectionFromContentType(type);

  try {
    return await client
      .db(DB_NAME)
      .collection(collection)
      .findOne({ _id: id, fromUserId: userId, appId });
  } finally {
    client.close();
  }
};
