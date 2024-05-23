/* eslint-disable import/no-relative-packages */
import MongoClient from '../mongoClient.ts';

export default async (
  appId,
  objId,
  collectionName,
  collectionField,
  userId,
  options = {
    safeExec: false,
    useTrashedField: true,
  }
) => {
  /* Mongo client */
  const client = await MongoClient.connect();

  try {
    const findObj = {
      _id: objId,
      appId,
    };

    if (options.useTrashedField) {
      findObj.trashed = false;
    }

    const obj = await client.db().collection(collectionName).findOne(findObj);

    let error = '';

    if (!obj) {
      error = 'content_not_found';
    } else if (obj[collectionField] !== userId) {
      error = 'forbidden_user';
    }

    if (options.safeExec) {
      return { results: obj, error };
    }

    if (error) {
      throw new Error(error);
    }

    return obj;
  } finally {
    client.close();
  }
};
