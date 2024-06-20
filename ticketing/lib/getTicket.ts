/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { TicketType } from './ticketEntity';

const { COLL_TICKETS } = mongoCollections;

export default async (ticketId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const ticket = await client
      .db()
      .collection(COLL_TICKETS)
      .findOne({ _id: ticketId, appId });

    return ticket as TicketType;
  } finally {
    client.close();
  }
};
