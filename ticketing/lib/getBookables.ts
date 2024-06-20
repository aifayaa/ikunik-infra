/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { BookableType } from './bookableEntity';

const { COLL_BOOKABLES } = mongoCollections;

export type GetBookablesParams = {
  query?: string;
  sort?: string;
  from?: string;
  to?: string;
};

type GetBookablesInternalDbMatchType = {
  appId: string;
  $or?: [{ name: RegExp }, { description: RegExp }];
  'limits.notAfter'?: {
    $gte: Date;
  };
  'limits.notBefore'?: {
    $lte: Date;
  };
};

const escapeRegExp = (string: string) =>
  String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async (
  appId: string,
  { query, sort, from, to }: GetBookablesParams
) => {
  const client = await MongoClient.connect();

  try {
    const dbMatch: GetBookablesInternalDbMatchType = { appId };
    let dbSort = [['createdAt', 1]];

    if (query) {
      dbMatch.$or = [
        { name: new RegExp(escapeRegExp(query)) },
        { description: new RegExp(escapeRegExp(query)) },
      ];
    }

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

    const bookables = await client
      .db()
      .collection(COLL_BOOKABLES)
      .find(dbMatch)
      .sort(dbSort)
      .toArray();

    return bookables as [BookableType];
  } finally {
    client.close();
  }
};
