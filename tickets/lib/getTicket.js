import { MongoClient } from 'mongodb';

export default async (ticketId) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    return await client.db(process.env.DB_NAME)
      .collection('tickets')
      .findOne({ _id: ticketId }, { projection: { serial: 0 } });
  } finally {
    client.close();
  }
};
