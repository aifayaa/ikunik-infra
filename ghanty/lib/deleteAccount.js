import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';
import MetricsTimer from './metricsTimer';
import deleteUser from '../../users/lib/deleteUser';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (
  appId,
  userId,
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

    // metricsTimer.start();
    // const response = await fidApi.call(`/...`, {
    //   method: 'POST',
    //   body: {
    //     addressCity,
    //     addressCountry,
    //     addressLine1,
    //     addressLine2,
    //     addressPostalCode,
    //     allowEmail,
    //     allowSms,
    //     birthday,
    //     civility,
    //     email,
    //     favoriteBrand1,
    //     favoriteBrand2,
    //     favoriteBrand3,
    //     favoriteShopArea,
    //     firstname,
    //     idClient,
    //     lastname,
    //     mobilePhone,
    //   },
    // });
    // metricsTimer.print('POST ...', { data? });

    await deleteUser(userId, appId);

    await metricsTimer.save(client);

    // return (response);
    return (true);
  } finally {
    client.close();
  }
};
