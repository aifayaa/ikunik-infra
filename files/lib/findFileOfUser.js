/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import getCollectionFromContentType from './getCollectionFromContentType';

export default async (userId, appId, file) => {
  const client = await MongoClient.connect();

  const { type, id } = file;
  const collection = getCollectionFromContentType(type);

  try {
    return await client
      .db()
      .collection(collection)
      .findOne({ _id: id, fromUserId: userId, appId });
  } finally {
    client.close();
  }
};
