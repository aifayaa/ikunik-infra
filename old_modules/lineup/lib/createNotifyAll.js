import { PromisePoolExecutor } from 'promise-pool-executor';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import createNotify from './createNotify';

const { COLL_LINEUPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const lineup = await client
      .db()
      .collection(COLL_LINEUPS)
      .find({
        startDate: { $gt: new Date() },
        appId,
      }, { projection: { _id: 1 } }).toArray();

    const pool = new PromisePoolExecutor({
      concurrencyLimit: 5,
    });
    await pool.addEachTask({
      data: lineup,
      generator: ({ _id }) => createNotify(_id, appId),
    }).promise();
    return true;
  } finally {
    client.close();
  }
};
