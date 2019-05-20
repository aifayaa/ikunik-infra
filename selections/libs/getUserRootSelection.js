import { MongoClient } from 'mongodb';

export default async (userId, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let selections = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .find({
        userId,
        selectionIds: { $exists: true },
        appIds: { $elemMatch: { $eq: appId } },
      })
      .toArray();
    selections = selections.map(selection => selection.selectionIds);
    selections = [].concat(...selections);
    selections = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .find({
        userId,
        _id: { $nin: selections },
        appIds: { $elemMatch: { $eq: appId } },
      })
      .toArray();
    return { selections };
  } finally {
    client.close();
  }
};
