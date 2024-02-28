/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';

import indexes from './indexes.json';

export default async () => {
  const client = await MongoClient.connect();
  try {
    const tasks = Object.keys(indexes).map((collection) =>
      client.db().collection(collection).createIndex(indexes[collection])
    );
    return Promise.all(tasks);
  } finally {
    client.close();
  }
};
