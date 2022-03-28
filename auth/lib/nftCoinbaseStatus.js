import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
} = mongoCollections;

export const nftCoinbaseStatus = async (userId, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db().collection(COLL_USERS);

    const user = await usersCollection.findOne({ _id: userId, appId });
    if (!user) {
      throw new Error('user_not_found');
    }

    if (!user.crypto || !user.crypto.wallets) {
      throw new Error('session_expired');
    }

    // if (user.services.coinbase.expiresAt.getTime() < Date.now()) {
    //   throw new Error('session_expired');
    // }

    /** @TODO Refresh the session if needed */

    return (user.crypto.wallets);
  } finally {
    client.close();
  }
};
