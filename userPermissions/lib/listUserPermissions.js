import MongoClient from '../../libs/mongoClient';

const {
  COLL_USER_PERMISSIONS,
} = process.env;

export default async (appId) => {
  const client = await MongoClient.connect();

  try {
    const userPerms = await client
      .db()
      .collection(COLL_USER_PERMISSIONS)
      .find({
        appId,
      })
      .toArray();

    return (userPerms);
  } finally {
    client.close();
  }
};
