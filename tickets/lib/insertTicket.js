import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';

const {
  COLL_TICKETS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (
  categoryId,
  serial,
  price,
  createdAt,
  email,
  firstname,
  lastname,
  userId,
  appId,
  opts,
) => {
  const ticketId = uuidv4();
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const ticket = {
      _id: ticketId,
      serial,
      categoryId,
      price,
      createdAt,
      userId,
      owner: {
        email,
        firstname,
        lastname,
      },
      appIds: [appId],
    };
    await client
      .db(DB_NAME)
      .collection(COLL_TICKETS)
      .insertOne(ticket, opts);
    return ticketId;
  } finally {
    client.close();
  }
};
