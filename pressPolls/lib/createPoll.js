import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS } = mongoCollections;

export default async (appId, userId, pollData) => {
  const client = await MongoClient.connect();

  try {
    const newPollObj = {
      ...pollData,
      appId,
      createdBy: userId,
      createdAt: new Date(),
    };

    const { insertedId } = await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .insertOne(newPollObj);

    return ({
      ...newPollObj,
      _id: insertedId,
    });
  } finally {
    client.close();
  }
};
