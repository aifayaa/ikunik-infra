import { MongoClient } from 'mongodb';
import uuidv4 from 'uuid/v4';

export default async (lineupId, categoryId, price, createdAt, email, firstname, lastname) => {
  const ticketId = uuidv4();
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const ticket = {
      _id: ticketId,
      lineupId,
      categoryId,
      price,
      createdAt,
      owner: {
        email,
        firstname,
        lastname,
      },
    };
    await client.db(process.env.DB_NAME).collection('tickets')
      .insertOne(ticket);
    return ticketId;
  } finally {
    client.close();
  }
};
