/* eslint-disable import/no-relative-packages */
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { OpenSeaApi } from '../../libs/opensea';

const { COLL_NFT_COLLECTIONS } = mongoCollections;

/**
 * A function that runs `exec` until it returns exactly `val`.
 * There is no delay between calls, you can handle that yourself.
 */
export function promiseExecUntilEqualsTo(val, exec) {
  return new Promise((resolve, reject) => {
    const process = (ret) => {
      if (ret === val) {
        resolve();
      } else {
        exec().then(process).catch(reject);
      }
    };

    process();
  });
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

      let collections;
      if (response instanceof Array) {
        collections = response;
      } else {
        collections = response.collections;
      }

      collectionsList = collectionsList.concat(
        collections.map((collection) => ({
          _id: new ObjectID().toString(),
          appId,
          createdAt: new Date(collection.created_date),
          description: collection.description,
          imageUrl: collection.image_url,
          name: collection.name,
          slug: collection.slug,
          wallet,
        }))
      );

      if (collections.length < limit) {
        return true;
      }

      offset += limit;
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return false;
    });

    if (collectionsList.length > 0) {
      await db.collection(COLL_NFT_COLLECTIONS).insertMany(collectionsList);
    }

    return collectionsList;
  } finally {
    client.close();
  }
};
