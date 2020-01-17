import MongoClient from '../../libs/mongoClient'

export default async (selectionIds, userId) => {
  const client = await MongoClient.connect();
  try {
    const selections = await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SELECTIONS)
      .find({ _id: { $in: selectionIds }, userId: { $ne: userId } })
      .count();
    return selections === 0;
  } finally {
    client.close();
  }
};
