import MongoClient from '../../../libs/mongoClient';
import mongoCollections from '../../../libs/mongoCollections.json';
import { MyFidApi } from '../../../libs/backends/ghanty-myfid';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (
  appId,
  userId,
  options = {},
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

    const pageSize = parseInt(options.pageSize || '20', 10);
    const page = parseInt(options.page || '0', 10) + 1;

    const response = await fidApi.call(`/users/${user.username}/proposals?pageSize=${pageSize}&pageNumber=${page}`);

    return (response);
  } finally {
    client.close();
  }
};
