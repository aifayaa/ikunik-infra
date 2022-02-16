import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  try {
    let selections = await client
      .db()
      .collection(mongoCollections.COLL_SELECTIONS)
      .find({
        userId,
        selectionIds: { $exists: true },
        appId,
      })
      .toArray();
    selections = selections.map((selection) => selection.selectionIds);
    selections = [].concat(...selections);
    selections = await client
      .db()
      .collection(mongoCollections.COLL_SELECTIONS)
      .find({
        userId,
        _id: { $nin: selections },
        appId,
      })
      .toArray();
    return { selections };
  } finally {
    client.close();
  }
};
