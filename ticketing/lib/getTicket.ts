/* eslint-disable import/no-relative-packages */
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { TicketType } from './ticketEntity';
import {
  ERROR_TYPE_NOT_FOUND,
  TICKET_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';

const { COLL_TICKETS } = mongoCollections;

export default async (ticketId: string, appId: string) => {
  const client = await MongoClient.connect();

  try {
    const ticket = await client
      .db()
      .collection(COLL_TICKETS)
      .findOne({ _id: ticketId, appId });

    if (!ticket) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        TICKET_NOT_FOUND_CODE,
        `Ticket ${ticketId} not found`
      );
    }

    return ticket as TicketType;
  } finally {
    client.close();
  }
};
