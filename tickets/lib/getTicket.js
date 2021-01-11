import MongoClient from '../../libs/mongoClient';

export default async (ticketId, appId, withSerial) => {
  let client;
  try {
    client = await MongoClient.connect();
    const projection = { serial: 0 };
    if (withSerial === true) delete projection.serial;
    return await client.db(process.env.DB_NAME)
      .collection(process.env.TICKETS)
      .findOne({
        _id: ticketId,
        appId,
      }, { projection });
  } finally {
    client.close();
  }
};
