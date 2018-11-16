import { MongoClient } from 'mongodb';

export default async (id) => {
  let client;
  try {
    console.log(id, process.env.DB_NAME, process.env.COLL_NAME);
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_NAME)
      .findOne({ _id: id, isPublished: true });
  } finally {
    client.close();
  }
};
