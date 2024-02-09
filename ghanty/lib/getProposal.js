import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (
  appId,
  userId,
  proposalId,
) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client.db().collection(COLL_USERS).findOne({ _id: userId });
    if (!app) {
      throw new Error('app_not_found');
    }
    if (!user) {
      throw new Error('user_not_found');
    }
    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    await fidApi.renewTokenIfNeeded(client);
    metricsTimer.print('renewTokenIfNeeded');

    metricsTimer.start();
    const response = await fidApi.call(`/users/${user.username}/proposal/${proposalId}/offers`);
    metricsTimer.print('GET proposal', { proposalId, username: user.username });

    await metricsTimer.save(client);

    return (response);
  } finally {
    client.close();
  }
};
