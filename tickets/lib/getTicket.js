import { MongoClient } from 'mongodb';

export default async (ticketId, appId, withSerial) => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const projection = { serial: 0 };
    if (withSerial === true) delete projection.serial;
    return await client.db(process.env.DB_NAME)
      .collection(process.env.TICKETS)
      .findOne({
        _id: ticketId,
        appIds: { $elemMatch: { $eq: appId } },
      }, { projection });
  } finally {
    client.close();
  }
};
