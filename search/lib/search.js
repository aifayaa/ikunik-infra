import isEmpty from 'lodash/isEmpty';
import omitBy from 'lodash/omitBy';
import zipObject from 'lodash/zipObject';
import { MongoClient } from 'mongodb';

import indexes from './indexes.json';

export default async (text) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const { DB_NAME } = process.env;
  try {
    const tasks = Object.keys(indexes).map((collection =>
      client.db(DB_NAME).collection(collection).find({ $text: { $search: text } }).toArray()
    ));
    const results = await Promise.all(tasks);
    return omitBy(zipObject(['audios', 'videos', 'artists', 'projects', 'selections'], results), isEmpty);
  } finally {
    client.close();
  }
};
