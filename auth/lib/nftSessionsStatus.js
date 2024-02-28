/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export const nftSessionsStatus = async (userId, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db().collection(COLL_USERS);

    const user = await usersCollection.findOne({ _id: userId, appId });
    if (!user) {
      throw new Error('user_not_found');
    }

    return {
      wallets: (user.crypto && user.crypto.wallets) || [],
      coinbase: !!user.services.coinbase,
      metamask: !!user.services.metamask,
      metamaskPending: !!user.services.metamaskLoginToken,
    };
  } finally {
    client.close();
  }
};
