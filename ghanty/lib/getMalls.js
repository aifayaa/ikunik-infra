import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { MyFidApi } from '../../libs/backends/ghanty-myfid';

const {
  COLL_APPS,
} = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) {
      throw new Error('app_not_found');
    }
    const fidApi = new MyFidApi(app);
    await fidApi.renewTokenIfNeeded(client);

    const response = await fidApi.call('/malls');

    return (response);
  } finally {
    client.close();
  }
};
