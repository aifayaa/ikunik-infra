import uuidv4 from 'uuid/v4';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_TICKETS } = mongoCollections;

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
  const client = await MongoClient.connect();
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
      appId,
    };
    await client
      .db()
      .collection(COLL_TICKETS)
      .insertOne(ticket, opts);
    return ticketId;
  } finally {
    client.close();
  }
};
