/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { TicketType } from './ticketEntity';

const { COLL_TICKETS } = mongoCollections;

export type ScanTicketType = {
  location: {
    label: string;
    geo?: {
      lat: number;
      lng: number;
    } | null;
  };
  bookableId: string;
};

export default async (
  ticketId: string,
  appId: string,
  userId: string,
  { location, bookableId }: ScanTicketType
) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_TICKETS)
      .updateOne(
        { _id: ticketId, appId, bookableId },
        {
          $push: {
            scans: {
              scannedAt: new Date(),
              scannedBy: userId,
              location,
            },
          },
        }
      );

    const ticket = await client
      .db()
      .collection(COLL_TICKETS)
      .findOne({ _id: ticketId, appId, bookableId });

    return ticket as TicketType;
  } finally {
    client.close();
  }
};
