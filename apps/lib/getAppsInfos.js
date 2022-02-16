/* * * * * * * * * * * * * * * * * * * * * * * * *
 *  NEVER EVER ADD A HANDLER RETURNING RESULTS FROM
 * THAT LIB TO THE END USER, ONLY USE IN OTHER LIBS
 * * * * * * * * * * * * * * * * * * * * * * * * */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_APPS,
} = mongoCollections;

export default async (
  getProtocol = false,
) => {
  const client = await MongoClient.connect();
  const projection = { name: 1, key: 1 };
  if (getProtocol) {
    projection.protocol = 1;
  }

  try {
    return await client
      .db()
      .collection(COLL_APPS)
      .find({}, { projection })
      .toArray();
  } finally {
    client.close();
  }
};
