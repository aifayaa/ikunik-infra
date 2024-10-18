/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';
import { TicketType } from './ticketEntity';

const { COLL_BOOKABLES, COLL_TICKETS } = mongoCollections;

export default async (bookableId: string, appId: string, userId: string) => {
  const client = await MongoClient.connect();

  try {
    const bookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    const tickets = await client
      .db()
      .collection(COLL_TICKETS)
      .find({ appId, bookableId, bookedBy: userId })
      .toArray();

    return {
      bookable: bookable as BookableType | null,
      tickets: tickets as TicketType[],
    };
  } finally {
    client.close();
  }
};
