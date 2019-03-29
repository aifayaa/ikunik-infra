import { MongoClient } from 'mongodb';

export default async (userId, val) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const { value } = await client.db(process.env.DB_NAME).collection('users')
      .findAndModify(
        { _id: userId },
        [],
        { $set: { optIn: val } },
        { new: true, projection: { optIn: true } },
      );
    return value;
  } finally {
    client.close();
  }
};
