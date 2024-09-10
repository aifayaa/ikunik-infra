/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_APPS } = mongoCollections;

type PluginAutoSetupParamsType = {
  pluginApiKey: string;
};

export default async (
  appId: string,
  { pluginApiKey }: PluginAutoSetupParamsType
) => {
  const client = await MongoClient.connect();
  try {
    await client
      .db()
      .collection(COLL_APPS)
      .updateOne(
        { _id: appId, 'backend.type': 'wordpress' },
        { $set: { 'backend.apiKey': pluginApiKey } }
      );

    return { ok: true };
  } finally {
    client.close();
  }
};
