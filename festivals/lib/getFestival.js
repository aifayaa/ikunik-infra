import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_FESTIVALS } = mongoCollections;

export default async (festivalId, appId) => {
  const client = await MongoClient.connect();
  try {
    const festival = await client
      .db()
      .collection(COLL_FESTIVALS)
      .findOne({
        _id: festivalId,
        appId,
      });
    return festival;
  } finally {
    client.close();
  }
};
