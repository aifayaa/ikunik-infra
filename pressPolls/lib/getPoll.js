import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_POLLS } = mongoCollections;

export default async (pollId, appId) => {
  const client = await MongoClient.connect();

  try {
    const poll = await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .findOne({ _id: pollId, appId });

    return (poll);
  } finally {
    client.close();
  }
};
