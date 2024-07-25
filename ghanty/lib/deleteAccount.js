/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';
// import deleteUser from '../../users/lib/deleteUser';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (appId, userId) => {
  const client = await MongoClient.connect();
  const metricsTimer = new MetricsTimer(__filename.replace(/.*\//, ''));
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne({ _id: userId });
    console.log('userId', userId);
    if (!app) {
      throw new Error('app_not_found');
    }
    console.log('PASS 0');
    if (!user) {
      throw new Error('user_not_found');
    }
    console.log('PASS 1');
    const fidApi = new MyFidApi(app);
    metricsTimer.start();
    console.log('PASS 2');
    await fidApi.renewLoginTokenIfNeeded(client);
    console.log('PASS 3');
    metricsTimer.print('renewLoginTokenIfNeeded');

    console.log('PASS 4');
    metricsTimer.start();
    const response = await fidApi.call(`/api/users/${user.username}`, {
      method: 'DELETE',
    });
    console.log('response', response);
    console.log('PASS 5');
    metricsTimer.print(`DELETE /api/users/${user.username}`);

    // await deleteUser(userId, appId);

    await metricsTimer.save(client);
    console.log('PASS 6');

    return response;
  } finally {
    client.close();
  }
};
