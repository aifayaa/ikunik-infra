/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_ORGANIZATIONS } = mongoCollections;

export default async (orgId, userId, { paymentOk }) => {
  const client = await MongoClient.connect();

  try {
    const org = await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .findOne({ _id: orgId });

    if (!org) {
      throw new Error('org_not_found');
    }

    const $set = {
      payment: {
        ok: paymentOk,
        setBy: userId,
        setAt: new Date(),
      },
    };
    await client
      .db()
      .collection(COLL_ORGANIZATIONS)
      .updateOne({ _id: orgId }, { $set });

    return { ...org, ...$set };
  } finally {
    client.close();
  }
};
