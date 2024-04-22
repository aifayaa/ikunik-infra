/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS, COLL_USERS } = mongoCollections;

export default async (userId, orgId) => {
  const client = await MongoClient.connect();

  // TODO: check if applications belong to an organisation
  // If there is at least an application, skip the deletion
  try {
    // Delete orgId in organisations collections
    await client.db().collection(COLL_ORGANIZATIONS).deleteOne({ _id: orgId });

    // Delete orgId from user permissions
    await client
      .db()
      .collection(COLL_USERS)
      .updateOne({ _id: userId }, { $pull: { 'perms.orgs': { _id: orgId } } });
  } finally {
    client.close();
  }
};
