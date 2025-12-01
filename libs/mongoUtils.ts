import MongoClient from './mongoClient.js';

export async function useMongoDb(
  cb: (db: any, client: any) => Promise<unknown>
) {
  const client = await MongoClient.connect();
  try {
    const db = client.db();

    const ret = await cb(db, client);

    return ret;
  } finally {
    await client.close();
  }
}
