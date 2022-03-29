import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
} = mongoCollections;

export default async (appId, userId, userMetamaskToken) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const found = await db.collection(COLL_USERS).findOne({
      appId,
      _id: userId,
      'services.metamaskLoginToken': userMetamaskToken,
    }, { projection: { _id: 1 } });

    return (!!found);
  } finally {
    client.close();
  }
};
