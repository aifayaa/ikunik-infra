/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { isAppAlreadyBuild } from '../../organizations/lib/organizationsUtils';

const { COLL_APPS } = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    if (!app) throw new Error('app_not_found');
    if (isAppAlreadyBuild(app)) {
      throw new Error('cannot_delete_app');
    }

    await client.db().collection(COLL_APPS).deleteOne({ _id: appId });

    // TODO: delete application permissions for the user owner of the
    //       application
    //       do it in a transaction

    return { deleted: true };
  } finally {
    client.close();
  }
};
