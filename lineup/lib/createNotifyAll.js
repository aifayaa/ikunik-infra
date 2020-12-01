import { PromisePoolExecutor } from 'promise-pool-executor';
import MongoClient from '../../libs/mongoClient';
import createNotify from './createNotify';

const {
  COLL_LINEUPS,
  DB_NAME,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const lineup = await client
      .db(DB_NAME)
      .collection(COLL_LINEUPS)
      .find({
        startDate: { $gt: new Date() },
        appIds: appId,
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
