/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    await fidApi.renewAPITokenIfNeeded(client);
    metricsTimer.print('renewAPITokenIfNeeded');

    metricsTimer.start();
    const response = await fidApi.call('/brands');
    metricsTimer.print('GET brands');

    await metricsTimer.save(client);

    return response;
  } finally {
    client.close();
  }
};
