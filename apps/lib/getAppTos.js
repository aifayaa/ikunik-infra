import MongoClient from '../../libs/mongoClient';

const {
  COLL_TOS,
  DB_NAME,
} = process.env;

export const getAppTos = async (appId) => {
  const client = await MongoClient.connect();
  try {
    const tosbyapp = await client
      .db(DB_NAME)
      .collection(COLL_TOS)
      .find({
        appIds: { $elemMatch: { $eq: appId } },
      }).toArray();
    return tosbyapp;
  } finally {
    client.close();
  }
};
