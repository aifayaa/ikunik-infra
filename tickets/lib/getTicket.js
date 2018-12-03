import { MongoClient } from 'mongodb';

export default async (ticketId, withSerial) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const projection = { serial: 0 };
    if (withSerial === true) delete projection.serial;
    return await client.db(process.env.DB_NAME)
      .collection('tickets')
      .findOne({ _id: ticketId }, { projection });
  } finally {
    client.close();
  }
};
