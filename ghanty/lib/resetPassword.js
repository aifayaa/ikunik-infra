import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';

const {
  COLL_APPS,
} = mongoCollections;

export default async (
  appId,
  {
    email,
  },
) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    await fidApi.renewTokenIfNeeded(client);
    metricsTimer.print('renewTokenIfNeeded');

    metricsTimer.start();
    const response = await fidApi.call('/password-reset', {
      method: 'POST',
      body: {
        email,
      },
    });
    metricsTimer.print('POST passwordReset', { email });

    await metricsTimer.save(client);

    return (response);
  } finally {
    client.close();
  }
};
