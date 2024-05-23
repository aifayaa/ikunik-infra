/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_USERS } = mongoCollections;

export default async (appId, userId, userMetamaskToken, wallet) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const user = await db.collection(COLL_USERS).findOne({
      appId,
      _id: userId,
      'services.metamaskLoginToken': userMetamaskToken,
    });

    if (!user) {
      throw new Error('user_metamask_token_not_found');
    }

    const action = {
      $unset: { 'services.metamaskLoginToken': '' },
    };
    if (!user.crypto || !user.crypto.wallets || !user.crypto.wallets.ETH) {
      action.$set = {
        'crypto.wallets.ETH': [wallet],
        'services.metamask': { connectedAt: new Date() },
      };
    } else {
      action.$set = { 'services.metamask': { connectedAt: new Date() } };
      action.$addToSet = { 'crypto.wallets.ETH': wallet };
    }

    await db.collection(COLL_USERS).updateOne(
      {
        appId,
        _id: userId,
      },
      action
    );
  } finally {
    client.close();
  }
};
