/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '../../libs/httpResponses/CrowdaaError';
import {
  BOOKABLE_NOT_FOUND_CODE,
  ERROR_TYPE_LIMIT_EXCEEDED,
  ERROR_TYPE_NOT_FOUND,
  MAX_TICKETS_EXCEEDED_CODE,
  MAX_USER_TICKETS_EXCEEDED_CODE,
} from '../../libs/httpResponses/errorCodes';
import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { TicketType } from './ticketEntity';

const { COLL_TICKETS, COLL_BOOKABLES } = mongoCollections;

export default async (
  appId: string,
  userId: string,
  bookableId: string,
  count: number
) => {
  const client = await MongoClient.connect();

  try {
    const tickets = [];

    const bookable = await client
      .db()
      .collection(COLL_BOOKABLES)
      .findOne({ _id: bookableId, appId });

    if (!bookable) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        BOOKABLE_NOT_FOUND_CODE,
        `The bookable '${bookableId}' cannot be found in app '${appId}'`
      );
    }

    let ticketsCount = await client
      .db()
      .collection(COLL_TICKETS)
      .find({ appId })
      .count();
    let userTicketsCount = await client
      .db()
      .collection(COLL_TICKETS)
      .find({ appId, bookedBy: userId })
      .count();

    if (
      bookable.limits.maxTickets > 0 &&
      ticketsCount >= bookable.limits.maxTickets
    ) {
      throw new CrowdaaError(
        ERROR_TYPE_LIMIT_EXCEEDED,
        MAX_TICKETS_EXCEEDED_CODE,
        `Maximum number of tickets exceeded on bookable '${bookableId}'`
      );
    }
    if (
      bookable.limits.maxTicketsPerAccount > 0 &&
      userTicketsCount >= bookable.limits.maxTicketsPerAccount
    ) {
      throw new CrowdaaError(
        ERROR_TYPE_LIMIT_EXCEEDED,
        MAX_USER_TICKETS_EXCEEDED_CODE,
        `Maximum number of tickets exceeded for your account on bookable '${bookableId}'`
      );
    }

    for (let i = 0; i < count; i++) {
      const newTicket = {
        _id: new ObjectID().toString(),
        appId,
        bookedBy: userId,
        bookedAt: new Date(),
        bookableId,
        scans: [],
      } as TicketType;

      await client.db().collection(COLL_TICKETS).insertOne(newTicket);

      tickets.push(newTicket);

      ticketsCount = await client
        .db()
        .collection(COLL_TICKETS)
        .find({ appId })
        .count();

      if (
        bookable.limits.maxTickets > 0 &&
        ticketsCount >= bookable.limits.maxTickets
      ) {
        if (ticketsCount > bookable.limits.maxTickets) {
          await client
            .db()
            .collection(COLL_TICKETS)
            .deleteOne({ _id: newTicket._id });
        }

        break;
      }

      userTicketsCount = await client
        .db()
        .collection(COLL_TICKETS)
        .find({ appId, bookedBy: userId })
        .count();

      if (
        bookable.limits.maxTicketsPerAccount > 0 &&
        userTicketsCount >= bookable.limits.maxTicketsPerAccount
      ) {
        if (userTicketsCount > bookable.limits.maxTicketsPerAccount) {
          await client
            .db()
            .collection(COLL_TICKETS)
            .deleteOne({ _id: newTicket._id });
        }

        break;
      }
    }

    return tickets;
  } finally {
    client.close();
  }
};
