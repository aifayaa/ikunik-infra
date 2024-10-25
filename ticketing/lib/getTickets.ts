/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { TicketType } from './ticketEntity';

const { COLL_TICKETS } = mongoCollections;

export type GetTicketsParams = {
  sort?: string;
  from?: string;
  to?: string;
  skip?: string;
  limit?: string;
};

type GetTicketsInternalDbMatchType = {
  appId: string;
  owner: string;
  'limits.notAfter'?: {
    $gte: Date;
  };
  'limits.notBefore'?: {
    $lte: Date;
  };
};

export default async (
  appId: string,
  userId: string,
  { sort, from, to, skip = '', limit = '' }: GetTicketsParams
) => {
  const client = await MongoClient.connect();

  try {
    const dbMatch: GetTicketsInternalDbMatchType = { appId, owner: userId };
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

    const cursor = await client
      .db()
      .collection(COLL_TICKETS)
      .find(dbMatch)
      .sort(dbSort);
    cursor.skip(parseInt(skip, 10) || 0);
    cursor.limit(parseInt(limit, 10) || 10);
    const tickets = await cursor.toArray();

    return { items: tickets as TicketType[], totalCount };
  } finally {
    client.close();
  }
};
