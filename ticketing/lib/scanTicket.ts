/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { TicketType } from './ticketEntity';

const { COLL_TICKETS } = mongoCollections;

export type ScanTicketType = {
  locationLabel: string;
  geo?: {
    lat: number;
    lon: number;
  };
};

export default async (
  ticketId: string,
  appId: string,
  userId: string,
  { locationLabel, geo }: ScanTicketType
) => {
  const client = await MongoClient.connect();

  try {
    await client
      .db()
      .collection(COLL_TICKETS)
      .updateOne(
        { _id: ticketId, appId },
        {
          $push: {
            scans: {
              scannedAt: new Date(),
              scannedBy: userId,
              location: {
                location: locationLabel,
                geo,
              },
            },
          },
        }
      );

    const ticket = await client
      .db()
      .collection(COLL_TICKETS)
      .findOne({ _id: ticketId, appId });

    return ticket as TicketType;
  } finally {
    client.close();
  }
};
