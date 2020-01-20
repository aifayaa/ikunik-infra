import MongoClient from '../../libs/mongoClient';

export default async (userId, appId) => {
  const client = await MongoClient.connect();
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
    selections = selections.map((selection) => selection.selectionIds);
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
