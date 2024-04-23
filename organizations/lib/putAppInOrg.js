/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getOrg from './getOrg';
import getOrgApps from './getOrgApps';

const { COLL_APPS } = mongoCollections;

export default async (orgId, bodyParsed) => {
  const client = await MongoClient.connect();

  try {
    const { appId } = bodyParsed;

    // Update the 'orgId' field of an app
    const commandResult = await client
      .db()
      .collection(COLL_APPS)
      .updateOne({ _id: appId }, { $set: { orgId } });

    const { matchedCount } = commandResult;

    // If the app is not found, return an error message
    if (matchedCount === 0) {
      throw new Error('app_not_found');
    }

    const org = await getOrg(orgId);
    const apps = await getOrgApps(orgId);
    return { ...org, apps };
  } finally {
    client.close();
  }
};
