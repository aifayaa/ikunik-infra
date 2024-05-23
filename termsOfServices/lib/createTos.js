/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_TOS } = mongoCollections;

export default async (
  appId,
  title,
  html,
  { userId, type, outdated, required, url }
) => {
  const client = await MongoClient.connect();
  try {
    const newTos = {
      _id: ObjectID().toString(),
      appId,
      createdAt: new Date(),
      createdBy: userId,
      html,
      outdated,
      required,
      title,
      type,
      url,
    };

    await client.db().collection(COLL_TOS).insertOne(newTos);

    return newTos;
  } finally {
    client.close();
  }
};
