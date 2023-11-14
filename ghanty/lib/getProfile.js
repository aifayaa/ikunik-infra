import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (
  appId,
  userId,
) => {
  const client = await MongoClient.connect();
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
    await fidApi.renewTokenIfNeeded(client);

    const response = await fidApi.call(`/users/${user.username}/profile`);

    return ({ balance: response.balance });
  } finally {
    client.close();
  }
};
