import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, val) => {
  const client = await MongoClient.connect();
  try {
    const { value } = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .findAndModify(
        { _id: userId },
        [],
        { $addToSet: { optIn: { $each: val } } },
        { new: true, projection: { optIn: true } },
      );
    return value;
  } finally {
    client.close();
  }
};
