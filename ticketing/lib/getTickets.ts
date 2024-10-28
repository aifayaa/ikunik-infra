/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';
import { TicketType } from './ticketEntity';

const { COLL_TICKETS, COLL_BOOKABLES } = mongoCollections;

type TicketWithBookableType = TicketType & {
  bookable: BookableType;
};

export type GetTicketsParams = {
  sort?: string;
  from?: string;
  to?: string;
  skip?: string;
  limit?: string;
};

type GetTicketsInternalDbMatchType = {
  appId: string;
  owner?: string;
  'limits.notAfter'?: {
    $gte: Date;
  };
  'limits.notBefore'?: {
    $lte: Date;
  };
};

export default async (
  appId: string,
  userId: string | null,
  { sort, from, to, skip = '', limit = '' }: GetTicketsParams
) => {
  const client = await MongoClient.connect();

  try {
    const dbMatch: GetTicketsInternalDbMatchType = { appId };
    if (userId) {
      dbMatch.owner = userId;
    }

    let dbSort = [['createdAt', 1]];

    if (sort) {
      const sortParams = sort.split(';');
      dbSort = sortParams.map((param: string) => {
        const [key, order] = param.split(',');
        return [key, order.toLowerCase() === 'asc' ? 1 : -1];
      });
    }
    if (from) {
      dbMatch['limits.notAfter'] = { $gte: new Date(from) };
    }
    if (to) {
      dbMatch['limits.notBefore'] = { $lte: new Date(to) };
    }

    const totalCount = await client
      .db()
      .collection(COLL_TICKETS)
      .find(dbMatch)
      .count();

    const rawTickets = await client
      .db()
      .collection(COLL_TICKETS)
      .aggregate([
        { $match: dbMatch },
        { $skip: parseInt(skip, 10) || 0 },
        { $limit: parseInt(limit, 10) || 10 },
        {
          $lookup: {
            from: COLL_BOOKABLES,
            localField: 'bookableId',
            foreignField: '_id',
            as: 'bookable',
          },
        },
      ])
      .toArray();

    const tickets: TicketWithBookableType = rawTickets.map(
      ({ bookable, ...ticket }: { bookable: BookableType[] }) => ({
        ...ticket,
        bookable: bookable[0],
      })
    );

    return { items: tickets, totalCount };
  } finally {
    client.close();
  }
};
