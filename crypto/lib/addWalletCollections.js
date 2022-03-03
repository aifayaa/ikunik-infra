import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { OpenSeaApi } from '../../libs/opensea';

const {
  COLL_NFT_COLLECTIONS,
} = mongoCollections;

/**
 * A function that runs `exec` until it returns exactly `val`.
 * There is no delay between calls, you can handle that yourself.
 */
export function promiseExecUntilEqualsTo(val, exec) {
  return (new Promise((resolve, reject) => {
    const process = (ret) => {
      if (ret === val) {
        resolve();
      } else {
        exec().then(process).catch(reject);
      }
    };

    process();
  }));
}

export default async (appId, wallet) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    const osApi = new OpenSeaApi();

    let collectionsList = [];
    const limit = 300;
    let offset = 0;
    await promiseExecUntilEqualsTo(true, async () => {
      const response = await osApi.call('/collections', {
        asset_owner: wallet,
        limit,
        offset,
      });

      const { collection: collections = [] } = response;

      const _id = (new ObjectID()).toString();
      collectionsList = collectionsList.concat(collections.map((collection) => ({
        _id,
        appId,
        createdAt: new Date(collection.created_date),
        description: collection.description,
        imageUrl: collection.image_url,
        name: collection.name,
        slug: collection.slug,
        wallet,
      })));

      if (collections.length < limit) {
        return (true);
      }

      offset += limit;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return (false);
    });

    await db.collection(COLL_NFT_COLLECTIONS).insertMany(collectionsList);

    const nftColls = await db.collection(COLL_NFT_COLLECTIONS).find({ appId }).toArray();

    return (nftColls);
  } finally {
    client.close();
  }
};
