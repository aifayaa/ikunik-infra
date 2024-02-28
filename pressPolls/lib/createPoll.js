/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS } = mongoCollections;

export default async (appId, userId, pollData) => {
  const client = await MongoClient.connect();

  try {
    const newPollObj = {
      ...pollData,
      _id: new ObjectID().toString(),
      appId,
      createdBy: userId,
      createdAt: new Date(),
    };

    await client.db().collection(COLL_PRESS_POLLS).insertOne(newPollObj);

    return newPollObj;
  } finally {
    client.close();
  }
};
