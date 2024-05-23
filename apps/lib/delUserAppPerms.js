/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import { getApplicationWithinOrg } from '../../libs/perms/checkPermsFor.ts';

const { COLL_APPS } = mongoCollections;

export default async (targetUserId, appId) => {
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
