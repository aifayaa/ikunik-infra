import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_FESTIVALS,
} = process.env;

export default async (festivalId, appId) => {
  const client = await MongoClient.connect();
  try {
    const festival = await client
      .db(DB_NAME)
      .collection(COLL_FESTIVALS)
      .findOne({
        _id: festivalId,
        appIds: { $elemMatch: { $eq: appId } },
      });
    return festival;
  } finally {
    client.close();
  }
};
