import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';

export default async (name, addr) => {
  const stageId = uuidv4();
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const stage = {
      _id: stageId,
      name,
      addr,
    };
    await client.db(process.env.DB_NAME).collection('stages')
      .insertOne(stage);
    return stageId;
  } finally {
    client.close();
  }
};
