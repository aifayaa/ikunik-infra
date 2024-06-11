/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.js';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor';

const { COLL_APPS } = mongoCollections;

export default async (targetUserId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    await getApplicationWithinOrg(appId);

    const db = client.db();
    await db
      .collection(COLL_APPS)
      .updateOne(
        { _id: appId },
        { $pull: { 'organization.users': { _id: targetUserId } } }
      );

    return {
      deletedResources: {
        userIds: [targetUserId],
      },
    };
  } finally {
    client.close();
  }
};
