import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async (lineupId, appId) => {
  let client;
  try {
    client = await MongoClient.connect();
    return await client
      .db()
      .collection(mongoCollections.COLL_LINEUPS)
      .findOne({
        _id: lineupId,
        appId,
      });
  } finally {
    client.close();
  }
};
