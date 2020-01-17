import MongoClient from '../../libs/mongoClient'

export default async (userId, val) => {
  const client = await MongoClient.connect();
  try {
    const { value } = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_USERS)
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
