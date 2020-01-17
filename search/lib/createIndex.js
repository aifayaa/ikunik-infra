import { MongoClient } from 'mongodb';

import indexes from './indexes.json';

export default async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useUnifiedTopology: true });
  try {
    const tasks = Object.keys(indexes).map((collection =>
      client.db(process.env.DB_NAME).collection(collection).createIndex(indexes[collection])
    ));
    return Promise.all(tasks);
  } finally {
    client.close();
  }
};

