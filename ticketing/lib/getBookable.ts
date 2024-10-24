/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';
import { TicketType } from './ticketEntity';
import {
  BOOKABLE_NOT_FOUND_CODE,
  ERROR_TYPE_NOT_FOUND,
} from '@libs/httpResponses/errorCodes';

const { COLL_BOOKABLES, COLL_TICKETS } = mongoCollections;

export default async (bookableId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const bookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    if (!bookable) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        BOOKABLE_NOT_FOUND_CODE,
        `Bookable event ${bookableId} not found`
      );
    }

    return bookable as BookableType;
  } finally {
    client.close();
  }
};

export async function getBookableAndTickets(
  bookableId: string,
  appId: string,
  userId: string
) {
  const client = await MongoClient.connect();

  try {
    const bookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    if (!bookable) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        BOOKABLE_NOT_FOUND_CODE,
        `Bookable event ${bookableId} not found`
      );
    }

    const tickets = await client
      .db()
      .collection(COLL_TICKETS)
      .find({ appId, bookableId, bookedBy: userId })
      .toArray();

    return {
      bookable: bookable as BookableType,
      tickets: tickets as TicketType[],
    };
  } finally {
    client.close();
  }
}
