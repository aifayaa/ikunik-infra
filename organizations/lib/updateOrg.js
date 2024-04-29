/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId, update) => {
  const client = await MongoClient.connect();

  try {
    const commandRes = await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .findOneAndUpdate(
        { _id: orgId },
        { $set: update },
        { returnNewDocument: true, returnDocument: 'after' }
      );

    console.log('commandRes', commandRes);

    const { ok, value: organization } = commandRes;

    console.log('ok', ok);
    console.log('organization', organization);

    if (!ok) {
      throw new Error('update_failed');
    }

    return organization;
  } finally {
    client.close();
  }
};
