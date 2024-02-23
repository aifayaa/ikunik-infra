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
  {
    offerId,
  },
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
    await fidApi.renewAPITokenIfNeeded(client);
    metricsTimer.print('renewAPITokenIfNeeded');

    metricsTimer.start();
    const response = await fidApi.call(`/users/${user.username}/proposals/${proposalId}/offers`, {
      method: 'POST',
      body: {
        id: offerId,
      },
    });
    metricsTimer.print('POST proposals/offers', { proposalId, offerId, username: user.username });

    await metricsTimer.save(client);

    return (response);
  } finally {
    client.close();
  }
};
