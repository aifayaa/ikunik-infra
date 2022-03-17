import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_NFT_COLLECTIONS,
} = mongoCollections;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const nftColls = await db.collection(COLL_NFT_COLLECTIONS).find({ appId }).toArray();

    return (nftColls);
  } finally {
    client.close();
  }
};
