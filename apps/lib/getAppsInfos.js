/* * * * * * * * * * * * * * * * * * * * * * * * *
 *  NEVER EVER ADD A HANDLER RETURNING RESULTS FROM
 * THAT LIB TO THE END USER, ONLY USE IN OTHER LIBS
 * * * * * * * * * * * * * * * * * * * * * * * * */
import MongoClient from '../../libs/mongoClient';

const {
  COLL_APPS,
  DB_NAME,
} = process.env;

export default async (
  getProtocol = 0,
) => {
  const client = await MongoClient.connect();
  const projection = { name: 1, key: 1, protocol: getProtocol };

  try {
    return await client
      .db(DB_NAME)
      .collection(COLL_APPS)
      .find({}, { projection })
      .toArray();
  } finally {
    client.close();
  }
};
