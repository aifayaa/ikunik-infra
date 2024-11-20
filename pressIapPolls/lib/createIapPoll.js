/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_IAP_POLLS } = mongoCollections;

export default async (appId, userId, iapPollData) => {
  const client = await MongoClient.connect();

  try {
    const newIapPollObj = {
      ...iapPollData,
      _id: new ObjectID().toString(),
      appId,
      createdBy: userId,
      createdAt: new Date(),
    };

    await client.db().collection(COLL_PRESS_IAP_POLLS).insertOne(newIapPollObj);

    return newIapPollObj;
  } finally {
    client.close();
  }
};
